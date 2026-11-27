import { $, $$, esc, money, mediaSrc, adminApi, toast, formError, busy, cents, bindImageInputs, errorBlock, emptyCard } from './core.js';
import { illustrationFor } from '/js/illustrations.js';

let items = [];
let branches = [];
let branchFilter = 'all';
let searchQuery = '';

// Branch names an item is limited to, e.g. "Aley only". Empty when every branch sells it.
function branchLabel(item) {
  if (branches.length < 2 || !item.branch_ids?.length) return '';
  const names = branches.filter((b) => item.branch_ids.includes(b.id)).map((b) => b.name);
  return names.length ? `${names.join(' & ')} only` : '';
}

function matchesBranchFilter(item) {
  if (branchFilter === 'all') return true;
  if (!item.branch_ids?.length) return true;
  return item.branch_ids.includes(Number(branchFilter));
}

function renderBranchFilters() {
  const el = $('#menu-branch-filters');
  if (!el) return;
  if (branches.length < 2) {
    el.innerHTML = '';
    return;
  }
  const counts = { all: items.length };
  for (const b of branches) {
    counts[b.id] = items.filter((i) => !i.branch_ids?.length || i.branch_ids.includes(b.id)).length;
  }
  el.innerHTML = [
    `<button type="button" data-branch-filter="all" aria-pressed="${branchFilter === 'all'}">All <span class="count">${counts.all}</span></button>`,
    ...branches.map((b) => `
      <button type="button" data-branch-filter="${b.id}" aria-pressed="${String(branchFilter) === String(b.id)}">${esc(b.name)} <span class="count">${counts[b.id] || 0}</span></button>`),
  ].join('');
}

$('#menu-branch-filters')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-branch-filter]');
  if (!btn) return;
  branchFilter = btn.dataset.branchFilter;
  render();
});

$('#menu-admin-search')?.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  render();
});

export async function load() {
  try {
    [items, branches] = await Promise.all([
      adminApi('/menu-items'),
      adminApi('/branches').then((list) => list.filter((b) => b.available)).catch(() => []),
    ]);
  } catch (err) {
    if (err.status !== 401) $('#items-list').innerHTML = errorBlock(err);
    return;
  }
  render();
}

function render() {
  renderBranchFilters();
  if (!items.length) {
    $('#items-list').innerHTML = emptyCard('🍰', 'Your menu is empty. Add your first item and it will appear on the Menu page.',
      '<button type="button" class="btn btn-gold btn-sm" data-add-item>+ Add item</button>');
    return;
  }
  const visible = items.filter((item) => {
    if (!matchesBranchFilter(item)) return false;
    if (!searchQuery) return true;
    return `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(searchQuery);
  });
  if (!visible.length) {
    $('#items-list').innerHTML = emptyCard('🔎', 'No menu items match the selected branch or search filter.');
    return;
  }
  const groups = new Map();
  for (const item of visible) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  $('#items-list').innerHTML = [...groups].map(([category, list]) => `
    <div class="card list-card">
      <div class="list-head"><h2>${esc(category)}</h2><span class="hint">${list.length} item${list.length === 1 ? '' : 's'}</span></div>
      ${list.map((item) => `
        <div class="row ${item.available ? '' : 'is-hidden'}">
          <div class="thumb-sm">${item.image ? `<img src="${esc(mediaSrc(item.image))}" alt="">` : illustrationFor(item)}</div>
          <div class="row-main">
            <div class="name">${esc(item.name)}
              ${item.available ? '' : '<span class="pill">Hidden</span>'}
              ${item.featured ? `<span class="pill featured">★ Slider${item.offer_badge ? ` · ${esc(item.offer_badge)}` : ''}</span>` : ''}
              ${branchLabel(item) ? `<span class="pill branch-only">${esc(branchLabel(item))}</span>` : ''}
              ${item.options.length ? `<span class="pill cake">${item.options.length} option group${item.options.length === 1 ? '' : 's'}</span>` : ''}
            </div>
            <div class="desc">${esc(item.description)}</div>
          </div>
          <div class="price">
            ${item.compare_price_cents > item.price_cents ? `<del class="muted small" style="display:block;font-weight:500;">${money(item.compare_price_cents)}</del>` : ''}
            ${money(item.price_cents)}
          </div>
          <div class="row-actions">
            <label class="switch" title="Show on the menu"><input type="checkbox" data-toggle="${item.id}" ${item.available ? 'checked' : ''}> Shown</label>
            <button type="button" class="btn btn-ghost btn-sm" data-edit="${item.id}">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" data-delete="${item.id}">Delete</button>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function itemFormData(item, { available = Boolean(item.available) } = {}) {
  const fd = new FormData();
  fd.append('name', item.name);
  fd.append('description', item.description);
  fd.append('category', item.category);
  fd.append('price', cents(item.price_cents));
  if (item.compare_price_cents) fd.append('compare_price', cents(item.compare_price_cents));
  if (item.featured) fd.append('featured', 'on');
  fd.append('offer_badge', item.offer_badge || '');
  fd.append('sort_order', item.sort_order);
  fd.append('options', JSON.stringify(item.options));
  if (available) fd.append('available', 'on');
  return fd;
}

// ---------- dialog ----------

const dialog = $('#item-dialog');
const form = $('#item-form');
const editor = $('#opt-editor');
let editing = null;

function open(item = null) {
  editing = item;
  form.reset();
  formError(form, '');
  $('#item-dialog-title').textContent = item ? 'Edit menu item' : 'Add menu item';
  $('#category-list').innerHTML = [...new Set(items.map((i) => i.category))].map((c) => `<option value="${esc(c)}"></option>`).join('');
  $('#i-name').value = item?.name ?? '';
  $('#i-category').value = item?.category ?? '';
  $('#i-price').value = item ? cents(item.price_cents) : '';
  if ($('#i-compare')) $('#i-compare').value = item?.compare_price_cents ? cents(item.compare_price_cents) : '';
  if ($('#i-featured')) $('#i-featured').checked = Boolean(item?.featured);
  if ($('#i-offer-badge')) $('#i-offer-badge').value = item?.offer_badge ?? '';
  if ($('#i-image-url')) $('#i-image-url').value = item?.image && (item.image.startsWith('/') || item.image.startsWith('http')) ? item.image : '';
  $('#i-description').value = item?.description ?? '';
  $('#i-sort').value = item?.sort_order ?? 0;
  $('#i-available').checked = item ? Boolean(item.available) : true;
  $('#i-remove-wrap').hidden = !item?.image;
  const sellsAt = item?.branch_ids?.length ? item.branch_ids : branches.map((b) => b.id);
  $('#i-branches-field').hidden = branches.length < 2;
  $('#i-branches').innerHTML = branches.map((b) => `
    <label class="checkbox"><input type="checkbox" data-branch-tick value="${b.id}" ${sellsAt.includes(b.id) ? 'checked' : ''}> ${esc(b.name)}</label>`).join('');
  setPreview(item?.image ? mediaSrc(item.image) : null);
  editor.innerHTML = '';
  (item?.options || []).forEach(addGroup);
  dialog.showModal();
}

function setPreview(src) {
  $('#i-preview').innerHTML = src ? `<img src="${esc(src)}" alt="">` : '';
}

bindImageInputs({
  fileInput: $('#i-image'),
  urlInput: $('#i-image-url'),
  removeBox: $('#i-remove'),
  getFallback: () => (editing?.image ? mediaSrc(editing.image) : null),
  onPreview: setPreview,
});

// ---------- add-on editor ----------

function addGroup(group = { name: '', type: 'single', required: false, choices: [{ name: '', price_cents: 0 }] }) {
  const el = document.createElement('div');
  el.className = 'opt-edit';
  el.innerHTML = `
    <div class="opt-edit-head">
      <input type="text" data-f="name" maxlength="40" placeholder="Group name, e.g. Size" value="${esc(group.name)}" aria-label="Option group name">
      <select data-f="type" aria-label="How many can be picked">
        <option value="single" ${group.type !== 'multi' ? 'selected' : ''}>Pick one</option>
        <option value="multi" ${group.type === 'multi' ? 'selected' : ''}>Pick any</option>
      </select>
      <label class="checkbox small"><input type="checkbox" data-f="required" ${group.required ? 'checked' : ''}> Required</label>
      <button type="button" class="btn btn-ghost btn-sm" data-remove-group>Remove</button>
    </div>
    <div data-choices></div>
    <button type="button" class="btn btn-ghost btn-sm" data-add-choice>+ Add choice</button>`;
  group.choices.forEach((c) => addChoice(el, c));
  syncRequired(el);
  editor.append(el);
}

function addChoice(groupEl, choice = { name: '', price_cents: 0 }) {
  const row = document.createElement('div');
  row.className = 'opt-choice';
  row.innerHTML = `
    <input type="text" data-c="name" maxlength="60" placeholder="Choice, e.g. Large" value="${esc(choice.name)}" aria-label="Choice name">
    <input type="text" data-c="price" inputmode="decimal" placeholder="+ 0.00" value="${choice.price_cents ? cents(choice.price_cents) : ''}" aria-label="Extra price">
    <button type="button" class="icon-btn" data-remove-choice aria-label="Remove choice">✕</button>`;
  $('[data-choices]', groupEl).append(row);
}

// "Required" only makes sense for pick-one groups.
function syncRequired(groupEl) {
  const multi = $('[data-f="type"]', groupEl).value === 'multi';
  const box = $('[data-f="required"]', groupEl);
  box.disabled = multi;
  if (multi) box.checked = false;
}

function readOptions() {
  return $$('.opt-edit', editor).map((g) => ({
    name: $('[data-f="name"]', g).value,
    type: $('[data-f="type"]', g).value,
    required: $('[data-f="required"]', g).checked,
    choices: $$('.opt-choice', g)
      .map((c) => ({ name: $('[data-c="name"]', c).value, price: $('[data-c="price"]', c).value.trim().replace(/^\+\s*/, '') }))
      .filter((c) => c.name.trim() || c.price),
  }));
}

$('#add-opt-group').addEventListener('click', () => addGroup());
editor.addEventListener('click', (e) => {
  const groupEl = e.target.closest('.opt-edit');
  if (e.target.closest('[data-remove-group]')) groupEl.remove();
  if (e.target.closest('[data-add-choice]')) addChoice(groupEl);
  if (e.target.closest('[data-remove-choice]')) e.target.closest('.opt-choice').remove();
});
editor.addEventListener('change', (e) => {
  if (e.target.matches('[data-f="type"]')) syncRequired(e.target.closest('.opt-edit'));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError(form, '');
  const fd = new FormData(form);
  // An empty file input still sends a blank part, which the server would reject as "not an image".
  if (!fd.get('image')?.size) fd.delete('image');
  fd.set('options', JSON.stringify(readOptions()));
  if (branches.length > 1) fd.set('branch_ids', $$('[data-branch-tick]:checked', form).map((c) => c.value).join(','));

  try {
    await busy($('button[type="submit"]', form), () => adminApi(
      editing ? `/menu-items/${editing.id}` : '/menu-items',
      { method: editing ? 'PUT' : 'POST', form: fd },
    ));
    dialog.close();
    toast(editing ? 'Item updated.' : 'Item added to the menu.');
    load();
  } catch (err) {
    formError(form, err.message);
  }
});

// ---------- list actions ----------

$('#add-item-btn').addEventListener('click', () => open());

$('#items-list').addEventListener('click', async (e) => {
  if (e.target.closest('[data-add-item]')) return open();
  const find = (attr) => items.find((i) => i.id === Number(e.target.closest(`[${attr}]`)?.getAttribute(attr)));

  const edit = find('data-edit');
  if (edit) return open(edit);

  const del = find('data-delete');
  if (del) {
    if (!confirm(`Delete "${del.name}" from the menu? This can't be undone.\n\nTip: untick "Shown" instead to hide it for now.`)) return;
    try {
      await adminApi(`/menu-items/${del.id}`, { method: 'DELETE' });
      toast('Item deleted.');
      load();
    } catch (err) {
      toast(err.message, true);
    }
  }
});

$('#items-list').addEventListener('change', async (e) => {
  const toggle = e.target.closest('[data-toggle]');
  if (!toggle) return;
  const item = items.find((i) => i.id === Number(toggle.dataset.toggle));
  try {
    await adminApi(`/menu-items/${item.id}`, { method: 'PUT', form: itemFormData(item, { available: toggle.checked }) });
    toast(toggle.checked ? `${item.name} is on the menu.` : `${item.name} is hidden from the menu.`);
  } catch (err) {
    toast(err.message, true);
  }
  load();
});
