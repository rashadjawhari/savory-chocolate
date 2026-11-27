import { $, $$, esc, adminApi, toast, formError, busy, cents } from './core.js';
import { loadBranches } from './branches.js';
import { parsePromoCodes } from '/js/promo.js';

const settingsForm = $('#settings-form');
const passwordForm = $('#password-form');
const promoRowsEl = $('#promo-rows');
const promoHidden = $('#s-promo_codes');
const MONEY_FIELDS = ['delivery_fee', 'delivery_min'];
let state = null;

function renderPromoRows(raw) {
  if (!promoRowsEl) return;
  const entries = [...parsePromoCodes(raw).entries()];
  if (!entries.length) {
    promoRowsEl.innerHTML = '<p class="muted small" style="margin:4px 0;">No active promo codes.</p>';
    return;
  }
  promoRowsEl.innerHTML = entries.map(([code, pct]) => promoRowHtml(code, pct)).join('');
}

function promoRowHtml(code = '', pct = 10) {
  return `
    <div class="promo-row">
      <input type="text" data-promo-code maxlength="24" placeholder="CODE" value="${esc(code)}">
      <div class="promo-pct-wrap">
        <input type="number" data-promo-pct min="1" max="75" value="${Number(pct) || 10}">
        <span>%</span>
      </div>
      <button type="button" class="icon-btn" data-remove-promo title="Remove code" aria-label="Remove code">✕</button>
    </div>`;
}

function syncPromoHidden() {
  if (!promoHidden || !promoRowsEl) return;
  const pairs = [];
  for (const row of $$('.promo-row', promoRowsEl)) {
    const code = $('[data-promo-code]', row)?.value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const pct = Math.max(1, Math.min(75, Math.round(Number($('[data-promo-pct]', row)?.value) || 0)));
    if (code && pct) pairs.push(`${code}:${pct}`);
  }
  promoHidden.value = pairs.join(', ');
}

$('#add-promo-btn')?.addEventListener('click', () => {
  if (!promoRowsEl) return;
  if (!promoRowsEl.querySelector('.promo-row')) promoRowsEl.innerHTML = '';
  promoRowsEl.insertAdjacentHTML('beforeend', promoRowHtml('', 10));
  promoRowsEl.querySelector('.promo-row:last-child [data-promo-code]')?.focus();
});

promoRowsEl?.addEventListener('click', (e) => {
  const rm = e.target.closest('[data-remove-promo]');
  if (!rm) return;
  rm.closest('.promo-row')?.remove();
  if (!promoRowsEl.querySelector('.promo-row')) {
    promoRowsEl.innerHTML = '<p class="muted small" style="margin:4px 0;">No active promo codes.</p>';
  }
});

export async function load(appState) {
  state = appState;
  loadBranches();
  try {
    state.settings = await adminApi('/settings');
  } catch { /* fallback to existing state.settings */ }
  const s = state.settings || {};
  for (const el of settingsForm.elements) {
    if (!el.name || !(el.name in s)) continue;
    if (el.type === 'checkbox') el.checked = s[el.name] === '1';
    else if (MONEY_FIELDS.includes(el.name)) el.value = cents(s[el.name]);
    else el.value = s[el.name];
  }
  renderPromoRows(s.promo_codes || '');
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError(settingsForm, '');
  syncPromoHidden();
  const body = Object.fromEntries(new FormData(settingsForm));
  body.orders_open = $('#s-orders_open').checked;
  body.delivery_enabled = $('#s-delivery_enabled').checked;
  try {
    await busy($('button[type="submit"]', settingsForm), () => adminApi('/settings', { method: 'PUT', body }));
    state.settings = await adminApi('/settings');
    load(state);
    toast('Settings saved.');
  } catch (err) {
    formError(settingsForm, err.message);
  }
});

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError(passwordForm, '');
  if (passwordForm.new_password.value !== passwordForm.confirm.value) {
    formError(passwordForm, 'The new passwords don\'t match.');
    return;
  }
  try {
    await busy($('button[type="submit"]', passwordForm), () => adminApi('/password', {
      method: 'POST',
      body: { current_password: passwordForm.current_password.value, new_password: passwordForm.new_password.value },
    }));
    passwordForm.reset();
    toast('Password updated.');
  } catch (err) {
    formError(passwordForm, err.message);
  }
});
