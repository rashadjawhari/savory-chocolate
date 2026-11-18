// Cloud Firestore & Firebase Authentication adapter for SAVORY static deployments.
// Lazy-loads the modular Firebase Web SDK v11 only when running outside Express (/api/*),
// keeping local Node/SQLite fast and zero-dependency while syncing cloud sites live.
import { parsePromoCodes } from './promo.js';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyALJI9iRgOTGdyMHvyFOHzg5he5Sl25P90',
  authDomain: 'savory-962f3.firebaseapp.com',
  projectId: 'savory-962f3',
  storageBucket: 'savory-962f3.firebasestorage.app',
  messagingSenderId: '364204889071',
  appId: '1:364204889071:web:02e086f49a973f9236dc1a',
  measurementId: 'G-GPXPY34T9Q',
};

const SDK_BASE = 'https://www.gstatic.com/firebasejs/11.10.0';
let sdkPromise = null;
let firestoreBlocked = false;

export function isCloudUnavailableError(err) {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return (
    code.includes('failed-precondition')
    || code.includes('unavailable')
    || code.includes('unimplemented')
    || code.includes('not-found')
    || msg.includes('cloud firestore api')
    || msg.includes('database (default) does not exist')
  );
}

async function getSdk() {
  if (typeof window === 'undefined') {
    throw Object.assign(new Error('Firebase Web SDK requires a browser environment.'), { code: 'unavailable' });
  }
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`${SDK_BASE}/firebase-app.js`),
        import(`${SDK_BASE}/firebase-auth.js`),
        import(`${SDK_BASE}/firebase-firestore.js`),
      ]);
      const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      return { app, auth, db, authMod, fsMod };
    })().catch((err) => {
      sdkPromise = null;
      throw err;
    });
  }
  return sdkPromise;
}

export function normalizeAdminEmail(usernameOrEmail) {
  const raw = String(usernameOrEmail || '').trim();
  if (!raw) return '';
  return raw.includes('@') ? raw : `${raw}@admin.savory-chocolate.com`;
}

export function extractCatalogPayload(state) {
  return {
    branches: state.branches || [],
    menu_items: state.menu_items || [],
    offers: state.offers || [],
    onboarding_slides: state.onboarding_slides || [],
    cake_groups: state.cake_groups || [],
    cake_options: state.cake_options || [],
    gallery_images: state.gallery_images || [],
    reviews: state.reviews || [],
    faqs: state.faqs || [],
    updated_at: new Date().toISOString(),
  };
}

export function splitSettings(settings = {}) {
  const pub = { ...settings };
  const promoCodes = String(pub.promo_codes ?? '');
  delete pub.promo_codes;
  return { pub, promoCodes };
}

export async function cloudFetchPublicState() {
  if (firestoreBlocked) return null;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, getDoc } = fsMod;
    const [settingsSnap, catalogSnap] = await Promise.all([
      getDoc(doc(db, 'site', 'public_settings')),
      getDoc(doc(db, 'site', 'catalog')),
    ]);
    if (!settingsSnap.exists() && !catalogSnap.exists()) return null;
    return {
      settings: settingsSnap.exists() ? settingsSnap.data() : null,
      catalog: catalogSnap.exists() ? catalogSnap.data() : null,
    };
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return null;
  }
}

export async function cloudLookupPromo(code) {
  const upper = String(code || '').trim().toUpperCase();
  if (!upper || firestoreBlocked) return null;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, getDoc } = fsMod;
    const snap = await getDoc(doc(db, 'promos', upper));
    if (!snap.exists()) return { exists: false };
    const d = snap.data();
    if (d.active === false) return { exists: false };
    return { exists: true, code: upper, percent: Number(d.percent) || 0 };
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return null;
  }
}

export async function cloudLookupOrderTracking(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean || firestoreBlocked) return null;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, getDoc } = fsMod;
    const snap = await getDoc(doc(db, 'order_tracking', clean));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return null;
  }
}

export async function cloudSubmitOrder(order) {
  if (firestoreBlocked) return false;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, writeBatch } = fsMod;
    const batch = writeBatch(db);
    const normItems = (order.items || []).map((it) => ({
      name: String(it.name || ''),
      unit_price_cents: Math.max(0, Math.round(Number(it.unit_price_cents) || 0)),
      quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
      details: it.details || {},
    }));
    const fullDoc = {
      ...order,
      id: order.code,
      delivery_fee_cents: Math.max(0, Math.round(Number(order.delivery_fee_cents) || 0)),
      discount_cents: Math.max(0, Math.round(Number(order.discount_cents) || 0)),
      total_cents: Math.max(0, Math.round(Number(order.total_cents) || 0)),
      items: normItems,
    };
    const firstName = String(order.customer_name || '').trim().split(/\s+/)[0] || 'Guest';
    const trackDoc = {
      code: order.code,
      order_code: order.code,
      type: order.type,
      status: order.status || 'new',
      customer_first_name: firstName.slice(0, 60),
      branch: order.branch || '',
      fulfillment: order.fulfillment || 'pickup',
      pickup_date: order.pickup_date || '',
      pickup_time: order.pickup_time || '',
      delivery_fee_cents: fullDoc.delivery_fee_cents,
      total_cents: fullDoc.total_cents,
      promo_code: order.promo_code || '',
      discount_cents: fullDoc.discount_cents,
      items: normItems,
      created_at: order.created_at || new Date().toISOString(),
    };
    batch.set(doc(db, 'orders', order.code), fullDoc);
    batch.set(doc(db, 'order_tracking', order.code), trackDoc);
    await batch.commit();
    return true;
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return false;
  }
}

export async function cloudSubmitMessage(msg) {
  if (firestoreBlocked) return false;
  try {
    const { db, fsMod } = await getSdk();
    const { collection, addDoc } = fsMod;
    await addDoc(collection(db, 'messages'), {
      name: String(msg.name || '').trim(),
      email: String(msg.email || '').trim(),
      phone: String(msg.phone || '').trim(),
      message: String(msg.message || '').trim(),
      is_read: 0,
      created_at: msg.created_at || new Date().toISOString(),
    });
    return true;
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return false;
  }
}

async function verifyAdminDoc(db, fsMod, user) {
  if (!user || firestoreBlocked) return { ok: true, firestoreOnline: false };
  const { doc, getDoc, setDoc } = fsMod;
  try {
    const ref = doc(db, 'admins', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return { ok: true, firestoreOnline: true };
    if (user.uid === 'savory-admin-1') {
      await setDoc(ref, {
        role: 'admin',
        email: user.email || '',
        username: (user.email || '').split('@')[0] || 'savory',
        created_at: new Date().toISOString(),
      });
      return { ok: true, firestoreOnline: true };
    }
    return { ok: false, firestoreOnline: true };
  } catch (err) {
    if (isCloudUnavailableError(err)) {
      firestoreBlocked = true;
      return { ok: true, firestoreOnline: false };
    }
    return { ok: false, firestoreOnline: true };
  }
}

function mapAuthError(err, fallback = 'Authentication failed.') {
  const code = String(err?.code || '').toLowerCase();
  if (
    code.includes('invalid-credential')
    || code.includes('wrong-password')
    || code.includes('user-not-found')
    || code.includes('invalid-email')
  ) {
    const out = new Error('Wrong username or password.');
    out.status = 401;
    out.isAuthRejection = true;
    return out;
  }
  if (code.includes('too-many-requests')) {
    const out = new Error('Too many failed sign-in attempts. Please wait a minute and try again.');
    out.status = 429;
    out.isAuthRejection = true;
    return out;
  }
  if (code.includes('weak-password')) {
    const out = new Error('Password must be at least 8 characters.');
    out.status = 400;
    out.isAuthRejection = true;
    return out;
  }
  return err instanceof Error ? err : new Error(fallback);
}

export async function cloudAdminLogin(usernameOrEmail, password) {
  const email = normalizeAdminEmail(usernameOrEmail);
  if (!email) throw Object.assign(new Error('Username or email is required.'), { status: 400, isAuthRejection: true });
  const { auth, db, authMod, fsMod } = await getSdk();
  let cred;
  try {
    cred = await authMod.signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    throw mapAuthError(err);
  }
  const check = await verifyAdminDoc(db, fsMod, cred.user);
  if (!check.ok) {
    await authMod.signOut(auth);
    throw Object.assign(new Error('This account is not listed in SAVORY admins.'), { status: 403, isAuthRejection: true });
  }
  return {
    admin: {
      uid: cred.user.uid,
      username: cred.user.email?.endsWith('@admin.savory-chocolate.com')
        ? cred.user.email.split('@')[0]
        : (cred.user.email || usernameOrEmail),
      email: cred.user.email || '',
    },
    firestoreOnline: check.firestoreOnline,
  };
}

export async function cloudAdminStatus() {
  const { auth, db, fsMod } = await getSdk();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return { admin: null, firestoreOnline: !firestoreBlocked };
  const check = await verifyAdminDoc(db, fsMod, user);
  if (!check.ok) return { admin: null, firestoreOnline: check.firestoreOnline };
  return {
    admin: {
      uid: user.uid,
      username: user.email?.endsWith('@admin.savory-chocolate.com')
        ? user.email.split('@')[0]
        : (user.email || 'Admin'),
      email: user.email || '',
    },
    firestoreOnline: check.firestoreOnline,
  };
}

export async function cloudAdminLogout() {
  const { auth, authMod } = await getSdk();
  await authMod.signOut(auth);
}

export async function cloudChangePassword(currentPassword, newPassword) {
  const { auth, authMod } = await getSdk();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || !user.email) throw Object.assign(new Error('Please log in again before changing your password.'), { status: 401 });
  try {
    const cred = authMod.EmailAuthProvider.credential(user.email, currentPassword);
    await authMod.reauthenticateWithCredential(user, cred);
    await authMod.updatePassword(user, newPassword);
  } catch (err) {
    const mapped = mapAuthError(err, 'Could not update password.');
    if (mapped.status === 401) {
      mapped.message = 'Current password is wrong.';
      mapped.status = 400;
    }
    throw mapped;
  }
}

export async function cloudSeedIfEmpty(seedState) {
  if (firestoreBlocked || !seedState) return false;
  try {
    const { auth, db, fsMod } = await getSdk();
    if (!auth.currentUser) return false;
    const { doc, getDoc } = fsMod;
    const catSnap = await getDoc(doc(db, 'site', 'catalog'));
    if (catSnap.exists()) return true;
    await cloudAdminSaveCatalog(seedState);
    await cloudAdminSaveSettings(seedState.settings || {});
    return true;
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return false;
  }
}

export async function cloudAdminSaveCatalog(state) {
  if (firestoreBlocked) return false;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, setDoc } = fsMod;
    await setDoc(doc(db, 'site', 'catalog'), extractCatalogPayload(state));
    return true;
  } catch (err) {
    if (isCloudUnavailableError(err)) {
      firestoreBlocked = true;
      return false;
    }
    throw err;
  }
}

export async function cloudAdminGetSettings(fallbackSettings = {}) {
  if (firestoreBlocked) return null;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, getDoc } = fsMod;
    const [pubSnap, privSnap] = await Promise.all([
      getDoc(doc(db, 'site', 'public_settings')),
      getDoc(doc(db, 'private', 'settings')),
    ]);
    if (!pubSnap.exists() && !privSnap.exists()) return null;
    return {
      ...fallbackSettings,
      ...(pubSnap.exists() ? pubSnap.data() : {}),
      ...(privSnap.exists() ? privSnap.data() : {}),
    };
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return null;
  }
}

export async function cloudAdminSaveSettings(allSettings) {
  if (firestoreBlocked) return false;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, collection, getDocs, writeBatch } = fsMod;
    const { pub, promoCodes } = splitSettings(allSettings);
    const batch = writeBatch(db);
    batch.set(doc(db, 'site', 'public_settings'), pub);
    batch.set(doc(db, 'private', 'settings'), { promo_codes: promoCodes });

    // Sync individual /promos/{CODE} lookup docs so guests can verify single codes without listing all codes.
    const desired = parsePromoCodes(promoCodes);
    const existingPromos = await getDocs(collection(db, 'promos'));
    for (const snap of existingPromos.docs) {
      if (!desired.has(snap.id)) batch.delete(snap.ref);
    }
    for (const [code, percent] of desired.entries()) {
      batch.set(doc(db, 'promos', code), { code, percent, active: true });
    }
    await batch.commit();
    return true;
  } catch (err) {
    if (isCloudUnavailableError(err)) {
      firestoreBlocked = true;
      return false;
    }
    throw err;
  }
}

export async function cloudAdminListOrders() {
  if (firestoreBlocked) return null;
  try {
    const { db, fsMod } = await getSdk();
    const { collection, getDocs, query, orderBy } = fsMod;
    const snap = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc')));
    return snap.docs.map((d) => {
      const data = d.data();
      return { ...data, code: data.code || d.id, id: data.id || d.id };
    });
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return null;
  }
}

export async function cloudAdminPatchOrderStatus(codeOrId, status) {
  if (firestoreBlocked) return false;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, writeBatch } = fsMod;
    const code = String(codeOrId || '').trim();
    const batch = writeBatch(db);
    batch.set(doc(db, 'orders', code), { status }, { merge: true });
    batch.set(doc(db, 'order_tracking', code), { status }, { merge: true });
    await batch.commit();
    return true;
  } catch (err) {
    if (isCloudUnavailableError(err)) {
      firestoreBlocked = true;
      return false;
    }
    throw err;
  }
}

export async function cloudAdminListMessages() {
  if (firestoreBlocked) return null;
  try {
    const { db, fsMod } = await getSdk();
    const { collection, getDocs, query, orderBy } = fsMod;
    const snap = await getDocs(query(collection(db, 'messages'), orderBy('created_at', 'desc')));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (err) {
    if (isCloudUnavailableError(err)) firestoreBlocked = true;
    return null;
  }
}

export async function cloudAdminPatchMessage(id, patch) {
  if (firestoreBlocked) return false;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, setDoc } = fsMod;
    await setDoc(doc(db, 'messages', String(id)), { is_read: patch.is_read ? 1 : 0 }, { merge: true });
    return true;
  } catch (err) {
    if (isCloudUnavailableError(err)) {
      firestoreBlocked = true;
      return false;
    }
    throw err;
  }
}

export async function cloudAdminDeleteMessage(id) {
  if (firestoreBlocked) return false;
  try {
    const { db, fsMod } = await getSdk();
    const { doc, deleteDoc } = fsMod;
    await deleteDoc(doc(db, 'messages', String(id)));
    return true;
  } catch (err) {
    if (isCloudUnavailableError(err)) {
      firestoreBlocked = true;
      return false;
    }
    throw err;
  }
}
