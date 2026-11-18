// Seeds Cloud Firestore on savory-962f3 from dist/menu/seed.json (excluding admin hashes/orders)
// using the .env admin account via official Firebase Auth & Firestore REST APIs.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { parsePromoCodes } from '../public/js/promo.js';

const PROJECT_ID = 'savory-962f3';
const API_KEY = 'AIzaSyALJI9iRgOTGdyMHvyFOHzg5he5Sl25P90';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function loadEnv() {
  if (!fs.existsSync('.env')) throw new Error('.env file not found. Run npm start or create .env first.');
  return Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return { nullValue: null };
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) fields[k] = toValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function toFields(obj) {
  return toValue(obj).mapValue.fields;
}

async function patchDoc(docPath, obj, token) {
  const res = await fetch(`${FS_BASE}/${docPath}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields: toFields(obj) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${docPath} failed (${res.status}): ${text}`);
  }
  return res.json();
}

const env = loadEnv();
if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env.');
}
if (!fs.existsSync('dist/menu/seed.json')) {
  execSync('npm run build:firebase', { stdio: 'inherit' });
}
const seed = JSON.parse(fs.readFileSync('dist/menu/seed.json', 'utf8'));
const email = env.ADMIN_USERNAME.includes('@')
  ? env.ADMIN_USERNAME
  : `${env.ADMIN_USERNAME}@admin.savory-chocolate.com`;

const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: env.ADMIN_PASSWORD, returnSecureToken: true }),
});
const authData = await authRes.json();
if (!authRes.ok || !authData.idToken) {
  throw new Error(`Firebase Auth sign-in failed: ${authData.error?.message || authRes.status}`);
}
const token = authData.idToken;
const uid = authData.localId;

// 1. Register admin UID marker doc (strictly matches firestore.rules /admins/{uid} schema)
await patchDoc(`admins/${uid}`, {
  uid,
  role: 'admin',
  email,
  username: env.ADMIN_USERNAME,
  created_at: new Date().toISOString(),
}, token);

// 2. Public & private settings + individual promo docs
const publicSettings = { ...(seed.settings || {}) };
const rawPromos = String(publicSettings.promo_codes || '');
delete publicSettings.promo_codes;

await patchDoc('site/public_settings', publicSettings, token);
await patchDoc('private/settings', { promo_codes: rawPromos }, token);

const promos = parsePromoCodes(rawPromos);
for (const [code, percent] of promos.entries()) {
  await patchDoc(`promos/${code}`, { code, percent, active: true }, token);
}

// 3. Aggregated public catalog doc
await patchDoc('site/catalog', {
  branches: seed.branches || [],
  menu_items: seed.menu_items || [],
  offers: seed.offers || [],
  onboarding_slides: seed.onboarding_slides || [],
  cake_groups: seed.cake_groups || [],
  cake_options: seed.cake_options || [],
  gallery_images: seed.gallery_images || [],
  reviews: seed.reviews || [],
  faqs: seed.faqs || [],
  updated_at: new Date().toISOString(),
}, token);

console.log(`Seeded Firestore (${PROJECT_ID}) cleanly: admin=${uid}, catalog items=${(seed.menu_items || []).length}, promos=${[...promos.keys()].join(',')}`);
