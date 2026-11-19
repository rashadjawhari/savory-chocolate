// Browser-side API handler for static Firebase Hosting deployments.
// Syncs live across devices with Cloud Firestore + Firebase Auth when enabled,
// and gracefully falls back to /seed.json + localStorage offline or pre-setup.
import { evaluatePromo, normalizePromoList } from './promo.js';
import {
  cloudFetchPublicState,
  cloudLookupPromo,
  cloudLookupOrderTracking,
  cloudSubmitOrder,
  cloudSubmitMessage,
  cloudAdminLogin,
  cloudAdminStatus,
  cloudAdminLogout,
  cloudChangePassword,
  cloudSeedIfEmpty,
  cloudAdminSaveCatalog,
  cloudAdminGetSettings,
  cloudAdminSaveSettings,
  cloudAdminListOrders,
  cloudAdminPatchOrderStatus,
  cloudAdminListMessages,
  cloudAdminPatchMessage,
  cloudAdminDeleteMessage,
} from './firebase-cloud.js';

const DB_KEY = 'savory_static_db_v7';
const SESSION_KEY = 'savory_admin_session_v1';
const ADMIN_USER_KEY = 'savory_admin_user_v1';
let cloudHydrated = false;

let seedPromise = null;

function loadSeed() {
  if (!seedPromise) {
    seedPromise = fetch('/seed.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return seedPromise;
}

async function getDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.admins) || !parsed.admins.length) {
        const seed = await loadSeed();
        if (seed?.admins?.length) {
          parsed.admins = seed.admins;
          saveDb(parsed);
        }
      }
      if (parsed.settings && parsed.settings.promo_codes === undefined) {
        const seed = await loadSeed();
        if (seed?.settings?.promo_codes !== undefined) {
          parsed.settings.promo_codes = seed.settings.promo_codes;
          saveDb(parsed);
        }
      }
      // Migrate legacy bundled /img/*.jpg asset URLs in cached static DBs to optimized .webp.
      let migratedWebp = false;
      const toWebp = (u) => {
        if (typeof u !== 'string' || !/^\/img\/.+\.jpg(\?.*)?$/i.test(u)) return u;
        migratedWebp = true;
        return u.replace(/\.jpg(\?.*)?$/i, '.webp$1');
      };
      for (const m of parsed.menu_items || []) m.image = toWebp(m.image);
      for (const o of parsed.offers || []) o.image = toWebp(o.image);
      for (const g of parsed.gallery_images || []) g.image = toWebp(g.image);
      for (const s of parsed.onboarding_slides || []) s.media_url = toWebp(s.media_url);
      if (migratedWebp) saveDb(parsed);
      return parsed;
    }
  } catch { /* ignore */ }

  const seed = (await loadSeed()) || {
    settings: { shop_name: 'SAVORY', currency: 'USD', orders_open: '1', delivery_enabled: '1', delivery_fee: '500', delivery_min: '0', cake_lead_days: '2', whatsapp: '+961 79 167 464', phone: '05 411 405' },
    branches: [],
    menu_items: [],
    offers: [],
    onboarding_slides: [],
    cake_groups: [],
    cake_options: [],
    gallery_images: [],
    reviews: [],
    faqs: [],
    orders: [],
    messages: [],
    admins: [],
  };
  saveDb(seed);
  return seed;
}

function saveDb(state) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function parseBody(body, form) {
  if (form instanceof FormData) {
    const obj = {};
    for (const [k, v] of form.entries()) {
      if (v instanceof File) continue;
      obj[k] = v;
    }
    if (typeof obj.data === 'string') {
      try {
        Object.assign(obj, JSON.parse(obj.data));
      } catch { /* ignore */ }
    }
    return obj;
  }
  return body || {};
}

function makeCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'SAV-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function buildWhatsAppUrl(state, order, itemsSummary, promo = null) {
  const branchObj = (state.branches || []).find((b) => b.name === order.branch);
  const rawWa = branchObj?.whatsapp || state.settings?.whatsapp || '+96179167464';
  const digits = String(rawWa).replace(/\D/g, '');
  const lines = [
    `New ${order.type === 'cake' ? 'Custom Cake' : 'Menu'} Order *${order.code}*`,
    `Customer: ${order.customer_name} (${order.customer_phone})`,
    `${order.fulfillment === 'delivery' ? `Delivery: ${order.delivery_address}` : `Pickup${order.branch ? ` (${order.branch})` : ''}`} on ${order.pickup_date} at ${order.pickup_time}`,
    '',
    ...itemsSummary,
    '',
    ...(promo?.valid && promo.discountCents > 0 ? [`*Promo ${promo.code} (-${promo.percent}%):* -$${(promo.discountCents / 100).toFixed(2)}`] : []),
    `Total: $${(order.total_cents / 100).toFixed(2)}`,
  ];
  if (order.notes) lines.push(`Notes: ${order.notes}`);
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

async function hydrateFromCloud(state) {
  if (cloudHydrated) return state;
  cloudHydrated = true;
  const cloud = await cloudFetchPublicState();
  if (!cloud) return state;
  if (cloud.settings) {
    const prevPromo = state.settings?.promo_codes;
    state.settings = { ...(state.settings || {}), ...cloud.settings };
    if (prevPromo !== undefined) state.settings.promo_codes = prevPromo;
  }
  if (cloud.catalog) {
    for (const k of ['branches', 'menu_items', 'offers', 'onboarding_slides', 'cake_groups', 'cake_options', 'gallery_images', 'reviews', 'faqs']) {
      if (Array.isArray(cloud.catalog[k])) state[k] = cloud.catalog[k];
    }
  }
  saveDb(state);
  return state;
}

async function resolvePromo(state, rawCode, subtotal = 0) {
  const clean = String(rawCode || '').trim().toUpperCase();
  if (!clean) return { valid: false, code: '', percent: 0, discountCents: 0 };
  const cloudRes = await cloudLookupPromo(clean);
  if (cloudRes) {
    if (!cloudRes.exists || cloudRes.percent <= 0) return { valid: false, code: clean, percent: 0, discountCents: 0 };
    const pct = cloudRes.percent;
    const discountCents = subtotal > 0 ? Math.round((subtotal * pct) / 100) : 0;
    return { valid: true, code: clean, percent: pct, discountCents };
  }
  return evaluatePromo(state.settings?.promo_codes, clean, subtotal);
}

export async function serverlessApi(rawPath, { method = 'GET', body, form } = {}) {
  const state = await hydrateFromCloud(await getDb());
  const url = new URL(rawPath, location.origin);
  const path = url.pathname;
  const data = parseBody(body, form);

  // ---------- Public Endpoints ----------
  if (method === 'GET' && path === '/api/settings') {
    const s = { ...(state.settings || {}) };
    delete s.promo_codes;
    return s;
  }
  if (method === 'POST' && path === '/api/promo/validate') {
    const res = await resolvePromo(state, data.code, Number(data.subtotal_cents) || 0);
    if (!res.valid) fail(400, 'Promo code is invalid or expired.');
    return res;
  }
  if (method === 'GET' && path === '/api/branches') return (state.branches || []).filter((b) => b.available !== 0);
  if (method === 'GET' && path === '/api/menu') {
    return (state.menu_items || [])
      .filter((i) => i.available !== 0)
      .map((i) => ({
        ...i,
        featured: i.featured ? 1 : 0,
        offer_badge: i.offer_badge || '',
        compare_price_cents: Number(i.compare_price_cents) || 0,
        options: typeof i.options === 'string' ? JSON.parse(i.options || '[]') : (i.options || []),
        branch_ids: soldAtIds(i, state),
      }));
  }
  if (method === 'GET' && path === '/api/offers') {
    return sortRows((state.offers || []).filter((o) => o.available !== 0));
  }
  if (method === 'GET' && path === '/api/onboarding') {
    return sortRows((state.onboarding_slides || []).filter((s) => s.available !== 0));
  }
  if (method === 'GET' && path === '/api/cake-options') {
    const rows = (state.cake_options || []).filter((r) => r.available !== 0);
    return {
      groups: (state.cake_groups || []).map((g) => ({
        key: g.key,
        label: g.label,
        mode: g.mode,
        options: rows.filter((r) => r.type === g.key),
      })),
    };
  }
  if (method === 'GET' && path === '/api/gallery') return sortRows(state.gallery_images || [], 'gallery');
  if (method === 'GET' && path === '/api/reviews') return (state.reviews || []).filter((r) => r.available !== 0);
  if (method === 'GET' && path === '/api/faqs') return (state.faqs || []).filter((f) => f.available !== 0);

  const trackMatch = path.match(/^\/api\/orders\/track\/([^/]+)$/);
  if (method === 'GET' && trackMatch) {
    const code = decodeURIComponent(trackMatch[1]).trim().toUpperCase();
    const cloudOrder = await cloudLookupOrderTracking(code);
    const localOrder = (state.orders || []).find((o) => String(o.code).toUpperCase() === code);
    const order = cloudOrder || localOrder;
    if (!order) {
      const err = new Error('No order found with that code. Please double-check your code.');
      err.status = 404;
      throw err;
    }
    const firstName = order.customer_first_name
      || String(order.customer_name || '').trim().split(/\s+/)[0]
      || 'Guest';
    return {
      code: order.code,
      type: order.type,
      status: order.status,
      customer_first_name: firstName,
      pickup_date: order.pickup_date,
      pickup_time: order.pickup_time,
      fulfillment: order.fulfillment,
      branch: order.branch,
      total_cents: order.total_cents,
      promo_code: order.promo_code || '',
      discount_cents: order.discount_cents || 0,
      delivery_fee_cents: order.delivery_fee_cents || 0,
      created_at: order.created_at,
      items: order.items || [],
      shop_phone: state.settings?.phone || '',
      shop_whatsapp: state.settings?.whatsapp || '',
    };
  }

  if (method === 'POST' && path === '/api/messages') {
    const msg = {
      id: Date.now(),
      name: String(data.name || '').trim(),
      email: String(data.email || '').trim(),
      phone: String(data.phone || '').trim(),
      message: String(data.message || '').trim(),
      is_read: 0,
      created_at: new Date().toISOString(),
    };
    await cloudSubmitMessage(msg);
    state.messages = [msg, ...(state.messages || [])];
    saveDb(state);
    return { ok: true };
  }

  if (method === 'POST' && path === '/api/orders/cake') {
    const optsById = new Map((state.cake_options || []).map((o) => [Number(o.id), o]));
    const size = optsById.get(Number(data.size));
    const scale = Number(size?.price_scale) || 1;
    const details = {};
    let unitPrice = 0;

    for (const g of state.cake_groups || []) {
      const rawPick = data[g.key];
      if (!rawPick) continue;
      if (g.mode === 'multi') {
        const ids = Array.isArray(rawPick) ? rawPick : String(rawPick).split(',').filter(Boolean);
        const picked = ids.map((id) => optsById.get(Number(id))).filter(Boolean);
        if (picked.length) {
          details[g.key] = picked.map((p) => p.name).join(', ');
          for (const p of picked) {
            unitPrice += p.scales ? Math.round((p.price_cents * scale) / 25) * 25 : p.price_cents;
          }
        }
      } else {
        const p = optsById.get(Number(rawPick));
        if (p) {
          details[g.key] = p.name;
          unitPrice += g.key === 'size' ? p.price_cents : (p.scales ? Math.round((p.price_cents * scale) / 25) * 25 : p.price_cents);
        }
      }
    }
    if (data.message) details.message = String(data.message).trim();
    if (data.design_notes) details.design_notes = String(data.design_notes).trim();

    const qty = Math.max(1, Number(data.quantity) || 1);
    const subtotal = unitPrice * qty;
    const rawPromo = String(data.promo_code || '').trim();
    const promo = rawPromo ? await resolvePromo(state, rawPromo, subtotal) : { valid: false, code: '', percent: 0, discountCents: 0 };
    if (rawPromo && !promo.valid) fail(400, 'Promo code is invalid or expired.');
    const deliveryFee = data.fulfillment === 'delivery' ? Number(state.settings?.delivery_fee || 0) : 0;
    const totalCents = Math.max(0, subtotal - promo.discountCents) + deliveryFee;
    const branchObj = (state.branches || []).find((b) => String(b.id) === String(data.branch));
    const code = makeCode();
    const item = {
      name: `Custom Cake (${details.size || 'Custom'})`,
      unit_price_cents: unitPrice,
      quantity: qty,
      details,
    };
    const savedNotes = promo.valid && promo.discountCents > 0
      ? [String(data.notes || '').trim(), `[Promo ${promo.code}: -${promo.percent}%]`].filter(Boolean).join('\n')
      : String(data.notes || '').trim();
    const order = {
      id: Date.now(),
      code,
      order_code: code,
      type: 'cake',
      status: 'new',
      customer_name: String(data.customer_name || '').trim(),
      customer_phone: String(data.customer_phone || '').trim(),
      customer_email: String(data.customer_email || '').trim(),
      pickup_date: String(data.pickup_date || ''),
      pickup_time: String(data.pickup_time || ''),
      fulfillment: data.fulfillment === 'delivery' ? 'delivery' : 'pickup',
      delivery_address: String(data.delivery_address || '').trim(),
      delivery_fee_cents: deliveryFee,
      branch: branchObj?.name || '',
      notes: savedNotes,
      total_cents: totalCents,
      promo_code: promo.valid ? promo.code : '',
      discount_cents: promo.valid ? promo.discountCents : 0,
      created_at: new Date().toISOString(),
      items: [item],
    };
    order.whatsapp_url = buildWhatsAppUrl(state, order, [`${qty}x ${item.name} - $${((unitPrice * qty) / 100).toFixed(2)}`], promo);
    await cloudSubmitOrder(order);
    state.orders = [order, ...(state.orders || [])];
    saveDb(state);
    return order;
  }

  if (method === 'POST' && path === '/api/orders/menu') {
    const menuById = new Map((state.menu_items || []).map((m) => [Number(m.id), m]));
    const orderBranch = (state.branches || []).find((b) => String(b.id) === String(data.branch));
    const orderItems = [];
    let subtotal = 0;

    for (const line of data.items || []) {
      const qty = Math.max(1, Number(line.quantity) || 1);
      if (line.custom_box) {
        fail(400, 'Gift boxes are no longer available. Please remove it from your cart.');
      } else {
        const item = menuById.get(Number(line.id));
        if (!item) continue;
        const soldAt = soldAtIds(item, state);
        if (orderBranch && soldAt.length && !soldAt.includes(Number(orderBranch.id))) {
          fail(400, `"${item.name}" isn't available at the ${orderBranch.name} branch. Please remove it or choose another branch.`);
        }
        const groups = parseOptions(item.options);
        const picks = Array.isArray(line.choices) ? line.choices : [];
        let extra = 0;
        const details = {};
        groups.forEach((g, gi) => {
          const chosen = Array.isArray(picks[gi]) ? [...new Set(picks[gi])] : [];
          if (!chosen.length) return;
          const names = chosen
            .filter((idx) => Number.isInteger(idx) && g.choices?.[idx])
            .sort((a, b) => a - b)
            .map((idx) => {
              extra += Number(g.choices[idx].price_cents) || 0;
              return g.choices[idx].name;
            });
          if (names.length) details[g.name] = names.join(', ');
        });
        if (line.note && str(line.note)) details.Note = str(line.note);
        const unitPrice = (Number(item.price_cents) || 0) + extra;
        orderItems.push({ name: item.name, unit_price_cents: unitPrice, quantity: qty, details });
        subtotal += unitPrice * qty;
      }
    }
    if (!orderItems.length) fail(400, 'Your cart is empty.');

    const rawPromo = String(data.promo_code || '').trim();
    const promo = rawPromo ? await resolvePromo(state, rawPromo, subtotal) : { valid: false, code: '', percent: 0, discountCents: 0 };
    if (rawPromo && !promo.valid) fail(400, 'Promo code is invalid or expired.');

    const deliveryFee = data.fulfillment === 'delivery' ? Number(state.settings?.delivery_fee || 0) : 0;
    const totalCents = Math.max(0, subtotal - promo.discountCents) + deliveryFee;
    const branchObj = (state.branches || []).find((b) => String(b.id) === String(data.branch));
    const code = makeCode();
    const savedNotes = promo.valid && promo.discountCents > 0
      ? [String(data.notes || '').trim(), `[Promo ${promo.code}: -${promo.percent}%]`].filter(Boolean).join('\n')
      : String(data.notes || '').trim();
    const order = {
      id: Date.now(),
      code,
      order_code: code,
      type: 'menu',
      status: 'new',
      customer_name: String(data.customer_name || '').trim(),
      customer_phone: String(data.customer_phone || '').trim(),
      customer_email: String(data.customer_email || '').trim(),
      pickup_date: String(data.pickup_date || ''),
      pickup_time: String(data.pickup_time || ''),
      fulfillment: data.fulfillment === 'delivery' ? 'delivery' : 'pickup',
      delivery_address: String(data.delivery_address || '').trim(),
      delivery_fee_cents: deliveryFee,
      branch: branchObj?.name || '',
      notes: savedNotes,
      total_cents: totalCents,
      promo_code: promo.valid ? promo.code : '',
      discount_cents: promo.valid ? promo.discountCents : 0,
      created_at: new Date().toISOString(),
      items: orderItems,
    };
    order.whatsapp_url = buildWhatsAppUrl(
      state,
      order,
      orderItems.map((i) => `${i.quantity}x ${i.name} - $${((i.unit_price_cents * i.quantity) / 100).toFixed(2)}`),
      promo,
    );
    await cloudSubmitOrder(order);
    state.orders = [order, ...(state.orders || [])];
    saveDb(state);
    return order;
  }

  // ---------- Admin Endpoints ----------
  if (path === '/api/admin/status') {
    const admins = state.admins || [];
    try {
      const cloud = await cloudAdminStatus();
      if (cloud.admin) {
        logIn(cloud.admin.username);
        return { setupNeeded: false, admin: cloud.admin };
      }
      logOut();
      return { setupNeeded: false, admin: null };
    } catch {
      return {
        setupNeeded: false,
        admin: isLoggedIn() && admins.length ? { id: 1, username: localStorage.getItem(ADMIN_USER_KEY) || admins[0].username } : null,
      };
    }
  }
  if (method === 'POST' && path === '/api/admin/setup') {
    fail(403, 'Public admin registration is disabled. Please log in.');
  }
  if (method === 'POST' && path === '/api/admin/login') {
    const uname = String(data.username || '').trim();
    const pw = String(data.password || '');
    try {
      const res = await cloudAdminLogin(uname, pw);
      logIn(res.admin.username);
      if (res.firestoreOnline) await cloudSeedIfEmpty(state);
      return { ok: true, admin: res.admin };
    } catch (err) {
      if (err.isAuthRejection || err.status === 401 || err.status === 403 || err.status === 429) {
        fail(err.status || 401, err.message);
      }
      if (typeof window !== 'undefined' && navigator?.onLine !== false && err?.code !== 'unavailable') {
        console.warn('[SAVORY Firebase Auth]', err?.code || '', err?.message || err);
        fail(401, err?.message || 'Sign-in failed.');
      }
      const admin = (state.admins || [])[0];
      const sameUser = admin && admin.username.toLowerCase() === uname.toLowerCase();
      if (!sameUser || !(await checkPassword(state, admin, pw))) {
        fail(401, 'Wrong username or password.');
      }
      logIn(admin.username);
      return { ok: true };
    }
  }
  if (method === 'POST' && path === '/api/admin/logout') {
    await cloudAdminLogout().catch(() => {});
    logOut();
    return { ok: true };
  }

  // Everything below needs a logged-in admin, like the real server.
  if (path.startsWith('/api/admin/') && !isLoggedIn()) fail(401, 'Please log in.');

  if (method === 'POST' && path === '/api/admin/password') {
    const cur = String(data.current_password || '');
    const { password } = checkCredentials((state.admins || [])[0]?.username || 'admin', data.new_password);
    try {
      await cloudChangePassword(cur, password);
    } catch (err) {
      if (err.status) fail(err.status, err.message);
      const admin = (state.admins || [])[0];
      if (!admin || !(await checkPassword(state, admin, cur))) fail(400, 'Current password is wrong.');
      admin.password_hash = await hashPassword(password);
      saveDb(state);
    }
    return { ok: true };
  }
  if (path === '/api/admin/counts') {
    const [cloudOrders, cloudMessages] = await Promise.all([cloudAdminListOrders(), cloudAdminListMessages()]);
    const allOrders = cloudOrders || state.orders || [];
    const allMsgs = cloudMessages || state.messages || [];
    return {
      newOrders: allOrders.filter((o) => o.status === 'new').length,
      unreadMessages: allMsgs.filter((m) => !m.is_read).length,
    };
  }
  if (method === 'GET' && path === '/api/admin/orders') {
    const filter = url.searchParams.get('status') || 'active';
    const all = (await cloudAdminListOrders()) || state.orders || [];
    const orders = filter === 'active'
      ? all.filter((o) => ['new', 'confirmed', 'baking', 'ready'].includes(o.status))
      : filter === 'all'
        ? all
        : all.filter((o) => o.status === filter);
    const counts = {};
    for (const o of all) counts[o.status] = (counts[o.status] || 0) + 1;
    return { orders, counts };
  }
  const orderPatch = path.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderPatch && method === 'PATCH') {
    if (!ORDER_STATUSES.includes(data.status)) fail(400, 'Unknown status.');
    const targetId = decodeURIComponent(orderPatch[1]);
    const o = (state.orders || []).find((x) => String(x.id) === targetId || String(x.code) === targetId);
    let synced = false;
    try {
      synced = await cloudAdminPatchOrderStatus(o?.code || targetId, data.status);
    } catch (err) {
      fail(500, err.message || 'Could not update order.');
    }
    if (o) {
      o.status = data.status;
      saveDb(state);
    } else if (!synced) {
      fail(404, 'Order not found.');
    }
    return { ok: true };
  }
  if (method === 'GET' && path === '/api/admin/cake-options') {
    return { groups: state.cake_groups || [], options: sortRows(state.cake_options) };
  }
  if (method === 'GET' && path === '/api/admin/settings') {
    const cloudSettings = await cloudAdminGetSettings(state.settings || {});
    if (cloudSettings) {
      state.settings = { ...(state.settings || {}), ...cloudSettings };
      saveDb(state);
    }
    return state.settings || {};
  }
  if (method === 'PUT' && path === '/api/admin/settings') {
    state.settings = { ...(state.settings || {}), ...settingsFields(data) };
    await cloudAdminSaveSettings(state.settings).catch((err) => {
      if (err && !String(err.code || '').includes('unavailable') && !String(err.code || '').includes('failed-precondition')) {
        throw err;
      }
    });
    saveDb(state);
    return state.settings;
  }
  if (method === 'POST' && path === '/api/admin/gallery') {
    fail(400, 'Photo uploads need the live server. This preview site can\'t store photos.');
  }

  // Reject binary file uploads cleanly when running in static Firebase Hosting mode.
  if (form instanceof FormData) {
    for (const v of form.values()) {
      if (v instanceof File && v.size > 0) {
        fail(400, 'File uploads require the live Node server. Paste a /img/... preset path or https:// URL instead.');
      }
    }
  }

  // Lists the dashboard manages: menu items, cake options, gallery, reviews, FAQ, branches, messages.
  const crud = path.match(/^\/api\/admin\/([a-z-]+)(?:\/([^/]+))?$/);
  const collection = crud && COLLECTIONS[crud[1]];
  if (collection) {
    if (crud[1] === 'messages') {
      const id = crud[2] ? decodeURIComponent(crud[2]) : null;
      if (id === null && method === 'GET') {
        const cloudMsgs = await cloudAdminListMessages();
        return cloudMsgs || sortRows(state.messages || [], 'newest');
      }
      if (id !== null && method === 'PATCH') {
        const patch = collection.patch(data);
        await cloudAdminPatchMessage(id, patch).catch(() => {});
        const local = (state.messages || []).find((r) => String(r.id) === id);
        if (local) { Object.assign(local, patch); saveDb(state); }
        return local || { id, ...patch };
      }
      if (id !== null && method === 'DELETE') {
        await cloudAdminDeleteMessage(id).catch(() => {});
        state.messages = (state.messages || []).filter((r) => String(r.id) !== id);
        saveDb(state);
        return { ok: true };
      }
    }

    const rows = (state[collection.key] ||= []);
    const id = crud[2] ? Number(crud[2]) : null;
    if (id === null) {
      if (method === 'GET') return sortRows(rows, collection.order).map(collection.out || ((r) => r));
      if (method === 'POST' && collection.fields) {
        const row = { id: nextId(rows), ...collection.fields(data, null, state) };
        rows.push(row);
        saveDb(state);
        await cloudAdminSaveCatalog(state).catch(() => {});
        return collection.out ? collection.out(row) : row;
      }
    } else {
      const index = rows.findIndex((r) => Number(r.id) === id);
      if (index === -1) fail(404, `${collection.label} not found.`);
      if (method === 'DELETE') {
        rows.splice(index, 1);
        saveDb(state);
        await cloudAdminSaveCatalog(state).catch(() => {});
        return { ok: true };
      }
      const update = method === 'PATCH' ? collection.patch : collection.fields;
      if ((method === 'PUT' || method === 'PATCH') && update) {
        Object.assign(rows[index], update(data, rows[index], state));
        saveDb(state);
        await cloudAdminSaveCatalog(state).catch(() => {});
        return collection.out ? collection.out(rows[index]) : rows[index];
      }
    }
  }

  fail(404, 'Not found.');
}

// ---------- Admin helpers ----------

const ORDER_STATUSES = ['new', 'confirmed', 'baking', 'ready', 'completed', 'cancelled'];

// Which branches sell a menu item (mirrors src/menu-branches.js). An empty list means every branch.
const openBranchIds = (state) => (state.branches || []).filter((b) => b.available !== 0).map((b) => Number(b.id));
function soldAtIds(item, state) {
  const open = openBranchIds(state);
  const ids = [...new Set((Array.isArray(item.branch_ids) ? item.branch_ids : []).map(Number))].filter((id) => open.includes(id));
  return ids.length === open.length ? [] : ids;
}
function pickBranchIds(value, existing, state) {
  if (value === undefined) return Array.isArray(existing) ? existing : [];
  const known = (state.branches || []).map((b) => Number(b.id));
  const picked = [...new Set((Array.isArray(value) ? value : String(value).split(',')).map((v) => Number(String(v).trim())).filter(Boolean))];
  if (picked.some((id) => !known.includes(id))) fail(400, 'That branch no longer exists. Please refresh the page.');
  if (!picked.length) fail(400, 'Tick at least one branch that sells this item.');
  const open = openBranchIds(state);
  return open.every((id) => picked.includes(id)) ? [] : picked.sort((a, b) => a - b);
}

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

const isLoggedIn = () => Boolean(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY));
function logIn(username = '') {
  localStorage.setItem(SESSION_KEY, '1');
  if (username) localStorage.setItem(ADMIN_USER_KEY, username);
}
function logOut() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

const bool = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'on';
const toCents = (v) => Math.max(0, Math.round(Number(v || 0) * 100)) || 0;
const toInt = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== undefined ? Math.round(Number(v)) : fallback);
const str = (v) => String(v ?? '').trim();
const nextId = (rows) => rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
const parseOptions = (v) => (typeof v === 'string' ? JSON.parse(v || '[]') : (v || []));

function sortRows(rows = [], order = 'sort') {
  const list = [...rows];
  if (order === 'newest') return list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id);
  if (order === 'gallery') return list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (b.id - a.id));
  return list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.id - b.id));
}

// Field rules mirror src/routes/admin.js, so the preview behaves like the real dashboard.
const COLLECTIONS = {
  'menu-items': {
    key: 'menu_items',
    label: 'Menu item',
    fields: (d, existing, state) => {
      const f = {
        name: str(d.name),
        description: str(d.description),
        category: str(d.category) || 'Other',
        price_cents: toCents(d.price),
        compare_price_cents: d.compare_price !== undefined && str(d.compare_price) !== '' ? toCents(d.compare_price) : 0,
        featured: bool(d.featured) ? 1 : 0,
        offer_badge: str(d.offer_badge),
        available: bool(d.available) ? 1 : 0,
        sort_order: toInt(d.sort_order),
        options: parseOptions(d.options),
        image: bool(d.remove_image) ? null : (str(d.image_url) || existing?.image || null),
        branch_ids: pickBranchIds(d.branch_ids, existing?.branch_ids, state),
      };
      if (!f.name) fail(400, 'Name is required.');
      if (f.available && f.price_cents === 0) fail(400, `Set a price for "${f.name}" before showing it on the menu.`);
      return f;
    },
    out: (item) => ({ ...item, options: parseOptions(item.options) }),
  },
  offers: {
    key: 'offers',
    label: 'Offer',
    fields: (d, existing) => {
      const target_type = ['product', 'category', 'box', 'none'].includes(str(d.target_type)) ? str(d.target_type) : 'category';
      const f = {
        title: str(d.title),
        subtitle: str(d.subtitle),
        badge: str(d.badge),
        cta_text: str(d.cta_text) || 'Explore',
        target_type,
        target_value: target_type === 'none' ? '' : str(d.target_value),
        image: bool(d.remove_image) ? '' : (str(d.image_url) || existing?.image || ''),
        available: bool(d.available) ? 1 : 0,
        sort_order: toInt(d.sort_order),
      };
      if (!f.title) fail(400, 'Offer title is required.');
      return f;
    },
  },
  onboarding: {
    key: 'onboarding_slides',
    label: 'Onboarding slide',
    fields: (d, existing) => {
      const media_url = str(d.media_url) || existing?.media_url || '';
      if (!media_url) fail(400, 'Please enter a media URL or preset path.');
      const explicit = str(d.media_type);
      const media_type = (explicit === 'video' || explicit === 'image')
        ? explicit
        : /\.(mp4|webm|mov)(\?.*)?$/i.test(media_url) ? 'video' : 'image';
      return {
        media_type,
        media_url,
        caption: str(d.caption),
        available: d.available === undefined ? (existing?.available ?? 1) : (bool(d.available) ? 1 : 0),
        sort_order: d.sort_order !== undefined ? toInt(d.sort_order) : (existing?.sort_order ?? 0),
      };
    },
  },
  'cake-options': {
    key: 'cake_options',
    label: 'Option',
    fields: (d) => {
      const isSize = d.type === 'size';
      const f = {
        type: str(d.type),
        name: str(d.name),
        description: str(d.description),
        price_cents: toCents(d.price),
        color: str(d.color),
        visual: str(d.visual),
        available: bool(d.available) ? 1 : 0,
        sort_order: toInt(d.sort_order),
        price_scale: isSize ? Math.round((Number(d.price_scale) || 1) * 100) / 100 : 1,
        lead_days: isSize ? toInt(d.lead_days) : 0,
        scales: isSize || bool(d.scales) ? 1 : 0,
      };
      if (!f.name) fail(400, 'Name is required.');
      return f;
    },
  },
  gallery: {
    key: 'gallery_images',
    label: 'Photo',
    order: 'gallery',
    fields: (d) => ({ caption: str(d.caption), sort_order: toInt(d.sort_order) }),
  },
  reviews: {
    key: 'reviews',
    label: 'Review',
    fields: (d) => {
      const f = {
        name: str(d.name),
        text: str(d.text),
        rating: Math.min(5, Math.max(1, toInt(d.rating, 5))),
        available: bool(d.available) ? 1 : 0,
        sort_order: toInt(d.sort_order),
      };
      if (!f.name || !f.text) fail(400, 'Name and review are required.');
      return f;
    },
  },
  faqs: {
    key: 'faqs',
    label: 'Question',
    fields: (d) => {
      const f = { question: str(d.question), answer: str(d.answer), available: bool(d.available) ? 1 : 0, sort_order: toInt(d.sort_order) };
      if (!f.question || !f.answer) fail(400, 'Question and answer are required.');
      return f;
    },
  },
  branches: {
    key: 'branches',
    label: 'Branch',
    fields: (d) => {
      const f = {
        name: str(d.name),
        address: str(d.address),
        phone: str(d.phone),
        whatsapp: str(d.whatsapp),
        maps_link: str(d.maps_link),
        available: bool(d.available) ? 1 : 0,
        sort_order: toInt(d.sort_order),
      };
      if (!f.name) fail(400, 'Branch name is required.');
      return f;
    },
  },
  messages: {
    key: 'messages',
    label: 'Message',
    order: 'newest',
    patch: (d) => ({ is_read: bool(d.is_read) ? 1 : 0 }),
  },
};

function settingsFields(d) {
  const out = {};
  for (const [k, v] of Object.entries(d)) {
    if (['orders_open', 'delivery_enabled'].includes(k)) out[k] = bool(v) ? '1' : '0';
    else if (['delivery_fee', 'delivery_min'].includes(k)) out[k] = String(toCents(v));
    else if (k === 'currency') out[k] = str(v).toUpperCase();
    else if (k === 'promo_codes') {
      try {
        out[k] = normalizePromoList(v);
      } catch (err) {
        fail(400, err.message);
      }
    }
    else out[k] = str(v);
  }
  return out;
}

function checkCredentials(rawUsername, rawPassword) {
  const username = str(rawUsername);
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) fail(400, 'Username must be 3–40 letters, numbers, dots, dashes or underscores.');
  const password = typeof rawPassword === 'string' ? rawPassword : '';
  if (password.length < 8) fail(400, 'Password must be at least 8 characters.');
  if (password.length > 200) fail(400, 'Password is too long.');
  return { username, password };
}

// Passwords are stored as salted PBKDF2-SHA256 hashes, never as plain text.
const PBKDF2_ROUNDS = 210000;
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

async function derive(password, salt, rounds) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, key, 256));
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ROUNDS}$${toHex(salt)}$${await derive(password, salt, PBKDF2_ROUNDS)}`;
}

async function checkPassword(state, admin, password) {
  // Accounts made by the old preview stored the password as plain text: check it once, then hash it.
  if (admin.password !== undefined && !admin.password_hash) {
    if (admin.password !== password) return false;
    admin.password_hash = await hashPassword(password);
    delete admin.password;
    saveDb(state);
    return true;
  }
  const [scheme, rounds, saltHex, hashHex] = String(admin.password_hash || '').split('$');
  if (scheme !== 'pbkdf2') return false;
  return (await derive(password, fromHex(saltHex), Number(rounds))) === hashHex;
}
