import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from './db.js';

const SESSION_COOKIE = 'sc_admin';
const SESSION_DAYS = 7;
const ENV_FILE = path.resolve('.env');

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function hashPasswordPbkdf2(password, rounds = 210000) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(Buffer.from(password, 'utf8'), salt, rounds, 32, 'sha256');
  return `pbkdf2$${rounds}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function randomToken(length, alphabet) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[match[1]] = val;
  }
  return out;
}

/**
 * Returns admin login credentials from environment variables or `.env`.
 * When none are set yet, generates random credentials and persists them to gitignored `.env`.
 */
export function resolveInitialAdminCredentials({ writeEnvIfMissing = true } = {}) {
  const envMap = readEnvFile();
  let username = (process.env.ADMIN_USERNAME || envMap.ADMIN_USERNAME || '').trim();
  let password = process.env.ADMIN_PASSWORD || envMap.ADMIN_PASSWORD || '';
  let generated = false;

  if (!username || !password) {
    generated = true;
    username = username || `savory_${randomToken(4, 'abcdefghjkmnpqrstuvwxyz23456789')}`;
    password = password || `Savory-${randomToken(10, 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#%')}`;
    if (writeEnvIfMissing) {
      const existing = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8').trimEnd() : '';
      const lines = existing ? existing.split(/\r?\n/).filter((l) => !/^\s*ADMIN_(USERNAME|PASSWORD)\s*=/.test(l)) : [];
      lines.push(`ADMIN_USERNAME=${username}`, `ADMIN_PASSWORD=${password}`);
      fs.writeFileSync(ENV_FILE, `${lines.join('\n')}\n`, 'utf8');
    }
  }

  process.env.ADMIN_USERNAME ||= username;
  process.env.ADMIN_PASSWORD ||= password;
  return { username, password, generated };
}

/** Ensures an admin login account exists in SQLite without exposing public signup. */
export function ensureDefaultAdmin() {
  if (adminCount() > 0) return null;
  const { username, password, generated } = resolveInitialAdminCredentials({ writeEnvIfMissing: true });
  db.prepare('INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)')
    .run(username, hashPassword(password));
  return { username, generated };
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export function adminCount() {
  return db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
}

export function createSession(res, adminId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)').run(token, adminId, expires);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function destroySession(req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(SESSION_COOKIE);
}

export function currentAdmin(req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  return db.prepare(`
    SELECT a.id, a.username FROM sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, Date.now()) ?? null;
}

export function requireAdmin(req, res, next) {
  const admin = currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Please log in.' });
  req.admin = admin;
  next();
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

// Slows down password guessing: 10 failed attempts per IP per 15 minutes.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;

export function loginBlocked(ip) {
  const entry = failures.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) return false;
  return entry.count >= 10;
}

export function recordLoginFailure(ip) {
  const entry = failures.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(ip, { first: Date.now(), count: 1 });
  else entry.count++;
}

export function clearLoginFailures(ip) {
  failures.delete(ip);
}
