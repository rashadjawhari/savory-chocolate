// Shared promo code parser, normalizer, and discount calculator used across server and client.

const CODE_RE = /^[A-Z0-9_-]{3,24}$/;

/**
 * Parses `CODE:PERCENT` entries (comma/newline/semicolon separated), e.g. "SAVORY10:10, EID15:15".
 * @returns {Map<string, number>}
 */
export function parsePromoCodes(raw) {
  const map = new Map();
  const str = String(raw || '').trim();
  if (!str) return map;
  for (const part of str.split(/[,;\r\n]+/)) {
    const clean = part.trim();
    if (!clean) continue;
    const [rawCode, rawPct] = clean.split(/[:=]/).map((s) => s.trim());
    const code = (rawCode || '').toUpperCase();
    const pct = Number(rawPct);
    if (!CODE_RE.test(code) || !Number.isInteger(pct) || pct < 1 || pct > 75) continue;
    map.set(code, pct);
  }
  return map;
}

/** Validates and formats a raw admin promo input string into canonical `CODE:PERCENT` pairs. */
export function normalizePromoList(raw) {
  const str = String(raw || '').trim();
  if (!str) return '';
  const entries = [];
  const seen = new Set();
  for (const part of str.split(/[,;\r\n]+/)) {
    const clean = part.trim();
    if (!clean) continue;
    const pieces = clean.split(/[:=]/).map((s) => s.trim());
    if (pieces.length !== 2) {
      throw new Error(`Invalid promo format "${clean}". Use CODE:PERCENT, e.g. SAVORY10:10.`);
    }
    const code = pieces[0].toUpperCase();
    const pct = Number(pieces[1]);
    if (!CODE_RE.test(code)) {
      throw new Error(`Promo code "${pieces[0]}" must be 3–24 letters, numbers, dashes or underscores.`);
    }
    if (!Number.isInteger(pct) || pct < 1 || pct > 75) {
      throw new Error(`Discount for "${code}" must be a whole number from 1 to 75%.`);
    }
    if (!seen.has(code)) {
      seen.add(code);
      entries.push(`${code}:${pct}`);
    }
  }
  return entries.join(', ');
}

/** Evaluates a customer-entered promo code against store settings and subtotal cents. */
export function evaluatePromo(rawSettingsCodes, enteredCode, subtotalCents = 0) {
  const code = String(enteredCode || '').trim().toUpperCase();
  if (!code) return { valid: false, code: '', percent: 0, discountCents: 0 };
  const catalog = parsePromoCodes(rawSettingsCodes);
  const percent = catalog.get(code) || 0;
  if (!percent) return { valid: false, code, percent: 0, discountCents: 0 };
  const sub = Math.max(0, Number(subtotalCents) || 0);
  const discountCents = Math.min(sub, Math.round((sub * percent) / 100));
  return { valid: true, code, percent, discountCents };
}
