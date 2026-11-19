// Re-prices an order from the shop's current menu, cake options, delivery fee and promo codes,
// and reports anything that doesn't add up.
//
// Orders on the Firebase site are written by the customer's browser, so their prices could have
// been edited before they were sent. The kitchen sees this check on every order card.
//
// No imports on purpose: this module is plain data in, plain data out, so it can be tested in Node.

const BOX_TIERS = {
  'savory 9-piece assorted gift box': 1800,
  'savory 16-piece luxury gift box': 3000,
  'savory 25-piece grand selection box': 4500,
};

// Detail keys that describe the order but carry no price.
const UNPRICED_DETAILS = new Set(['note', 'message', 'design_notes', 'dietary', 'assortment', 'ribbon', 'gift card']);

const norm = (s) => String(s ?? '').trim().toLowerCase();
const splitNames = (value) => String(value ?? '').split(/,\s*/).map((s) => s.trim()).filter(Boolean);

/**
 * @param {object} catalog
 *   menuItems:   [{ name, price_cents, options: [{ name, choices: [{ name, price_cents }] }] }]
 *   cakeGroups:  [{ key, mode }]
 *   cakeOptions: [{ type, name, price_cents, price_scale, scales }]
 *   deliveryFeeCents: number
 *   promoPercent: (code) => percent (0 when the code isn't active)
 */
export function buildPriceIndex(catalog) {
  const menu = new Map();
  for (const item of catalog.menuItems || []) menu.set(norm(item.name), item);
  const cake = new Map();
  for (const opt of catalog.cakeOptions || []) cake.set(`${opt.type}|${norm(opt.name)}`, opt);
  return {
    menu,
    cake,
    cakeGroups: catalog.cakeGroups || [],
    deliveryFeeCents: Number(catalog.deliveryFeeCents) || 0,
    promoPercent: catalog.promoPercent || (() => 0),
  };
}

// Possible unit prices for a menu line (one value), or null when it can't be priced from the menu.
function priceMenuLine(line, index) {
  const box = BOX_TIERS[norm(line.name)];
  if (box !== undefined) return { prices: [box] };
  const item = index.menu.get(norm(line.name));
  if (!item) return { unknown: `"${line.name}" is no longer on the menu under that name` };
  let price = Number(item.price_cents) || 0;
  const groups = Array.isArray(item.options) ? item.options : [];
  const groupNames = new Set(groups.map((g) => norm(g.name)));
  for (const [key, value] of Object.entries(line.details || {})) {
    if (UNPRICED_DETAILS.has(norm(key))) continue;
    if (!groupNames.has(norm(key))) return { unknown: `"${line.name}" has an option "${key}" the menu no longer offers` };
  }
  for (const group of groups) {
    for (const choiceName of splitNames(line.details?.[group.name])) {
      const choice = (group.choices || []).find((c) => norm(c.name) === norm(choiceName));
      if (!choice) return { unknown: `"${line.name}" has a choice "${choiceName}" the menu no longer offers` };
      price += Number(choice.price_cents) || 0;
    }
  }
  return { prices: [price] };
}

// Cake prices: add-ons can scale with the size. The Node server rounds scaled prices to 50 cents and
// the Firebase site to 25, so both results count as correct.
function priceCakeLine(line, index) {
  const details = line.details || {};
  const size = details.size ? index.cake.get(`size|${norm(details.size)}`) : null;
  if (details.size && !size) return { unknown: `cake size "${details.size}" is no longer offered` };
  const scale = Number(size?.price_scale) || 1;
  const totals = [0, 0];
  const steps = [25, 50];
  for (const group of index.cakeGroups) {
    for (const name of splitNames(details[group.key])) {
      const opt = index.cake.get(`${group.key}|${norm(name)}`);
      if (!opt) return { unknown: `cake option "${name}" is no longer offered` };
      const base = Number(opt.price_cents) || 0;
      steps.forEach((step, i) => {
        if (group.key === 'size' || !opt.scales || scale === 1 || !base) totals[i] += base;
        else totals[i] += Math.round((base * scale) / step) * step;
      });
    }
  }
  return { prices: [...new Set(totals)] };
}

const isCakeLine = (order, line) => order.type === 'cake' || /^custom cake/i.test(String(line.name || ''));

/**
 * @returns {{ status: 'ok' | 'mismatch' | 'unknown', direction: 'under' | 'over' | null,
 *             expectedTotal: number | null, issues: string[], notes: string[] }}
 */
export function checkOrderPrice(order, index, money = (c) => `$${(c / 100).toFixed(2)}`) {
  const issues = [];
  const notes = [];
  const lines = Array.isArray(order.items) ? order.items : [];

  let statedSubtotal = 0;
  let expectedSubtotal = 0;
  let fullyPriced = true;

  for (const line of lines) {
    const qty = Math.max(0, Number(line.quantity) || 0);
    const stated = Number(line.unit_price_cents) || 0;
    statedSubtotal += stated * qty;
    const result = isCakeLine(order, line) ? priceCakeLine(line, index) : priceMenuLine(line, index);
    if (result.unknown) {
      fullyPriced = false;
      notes.push(`Can't re-price ${result.unknown}.`);
      expectedSubtotal += stated * qty;
      continue;
    }
    if (result.prices.includes(stated)) {
      expectedSubtotal += stated * qty;
    } else {
      const expected = result.prices[0];
      issues.push(`${line.name}: charged ${money(stated)} each, the menu price is ${money(expected)}.`);
      expectedSubtotal += expected * qty;
    }
  }

  // Promo code
  const code = String(order.promo_code || '').trim().toUpperCase();
  const statedDiscount = Math.max(0, Number(order.discount_cents) || 0);
  let expectedDiscount = 0;
  if (code) {
    const percent = Number(index.promoPercent(code)) || 0;
    if (!percent) {
      issues.push(`Promo code ${code} isn't in your current promo list.`);
    } else {
      expectedDiscount = Math.round((expectedSubtotal * percent) / 100);
      if (order.promo_percent !== undefined && Number(order.promo_percent) > percent) {
        issues.push(`Promo ${code} is ${percent}% but the order claims ${Number(order.promo_percent)}%.`);
      }
    }
  } else if (statedDiscount > 0) {
    issues.push(`A ${money(statedDiscount)} discount was applied without a promo code.`);
  }

  // Delivery fee
  const delivery = order.fulfillment === 'delivery';
  const statedFee = Math.max(0, Number(order.delivery_fee_cents) || 0);
  const expectedFee = delivery ? index.deliveryFeeCents : 0;
  if (statedFee !== expectedFee) {
    issues.push(delivery
      ? `Delivery fee is ${money(statedFee)}; your current fee is ${money(expectedFee)}.`
      : `A ${money(statedFee)} delivery fee is on a pickup order.`);
  }

  // The order's own numbers should add up: items − discount + delivery = total.
  const statedTotal = Number(order.total_cents) || 0;
  const selfConsistentTotal = Math.max(0, statedSubtotal - statedDiscount) + statedFee;
  if (statedTotal !== selfConsistentTotal) {
    issues.push(`The total (${money(statedTotal)}) doesn't match its own items, discount and delivery (${money(selfConsistentTotal)}).`);
  }

  const expectedTotal = Math.max(0, expectedSubtotal - expectedDiscount) + expectedFee;
  if (statedTotal !== expectedTotal && !issues.some((i) => i.startsWith('The total'))) {
    issues.push(`Order total is ${money(statedTotal)}; at current prices it should be ${money(expectedTotal)}.`);
  }

  let status = 'ok';
  if (issues.length) status = 'mismatch';
  else if (!fullyPriced) status = 'unknown';
  const direction = status === 'mismatch' && statedTotal !== expectedTotal ? (statedTotal < expectedTotal ? 'under' : 'over') : null;
  return { status, direction, expectedTotal, issues, notes };
}
