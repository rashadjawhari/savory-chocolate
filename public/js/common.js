// Helpers shared by every public page. Importing this module also wires up the
// header (scroll state + mobile menu + bilingual AR/EN switcher) and scroll-reveal animations.

import { serverlessApi } from '/js/serverless-api.js';
import { tr, isAr } from '/js/i18n-ar.js';

export { tr, isAr };

let useServerlessFallback = typeof location !== 'undefined' && /(^|\.)(web\.app|firebaseapp\.com)$/i.test(location.hostname);

export async function api(path, { method = 'GET', body, form } = {}) {
  if (useServerlessFallback) {
    return serverlessApi(path, { method, body, form });
  }
  const options = { method, headers: {} };
  if (form) {
    options.body = form;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    useServerlessFallback = true;
    return serverlessApi(path, { method, body, form });
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    useServerlessFallback = true;
    return serverlessApi(path, { method, body, form });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export function mediaSrc(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return raw.replace(/^(\/img\/.+)\.jpg(\?.*)?$/i, '$1.webp$2');
  if (/^https?:\/\//i.test(raw)) return raw;
  return `/uploads/${raw}`;
}

let currency = 'USD';
export function money(cents) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2);
  }
}

export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* private mode or storage blocked: it just won't persist */ }
  },
};

// YYYY-MM-DD in the visitor's local time, `daysAhead` from today.
export function isoDate(daysAhead = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function friendlyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(isAr() ? 'ar-LB' : undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function friendlyTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export async function loadSettings() {
  try {
    const settings = await api('/api/settings');
    currency = settings.currency || 'USD';
    return settings;
  } catch {
    return {};
  }
}

// Wires a Pickup / Delivery toggle inside `root`: shows the address fields and swaps labels.
// Returns a function that reports the current choice.
export function setupFulfillment(root, settings, onChange = () => {}) {
  const toggle = root.querySelector('[data-fulfillment]');
  const address = root.querySelector('[data-delivery-fields]');
  const addressInput = address?.querySelector('textarea');
  if (settings.delivery_enabled !== '1') {
    toggle.hidden = true;
    address.hidden = true;
    return () => 'pickup';
  }
  const updateAreaHint = () => {
    const ar = isAr();
    const fee = Number(settings.delivery_fee);
    const min = Number(settings.delivery_min);
    root.querySelector('[data-delivery-area]').textContent = [
      settings.delivery_area,
      fee
        ? (ar ? `رسوم التوصيل: ${money(fee)}.` : `Delivery fee: ${money(fee)}.`)
        : (ar ? 'توصيل مجاني.' : 'Free delivery.'),
      min
        ? (ar ? `الحد الأدنى للطلب ${money(min)}.` : `Minimum order ${money(min)}.`)
        : '',
    ].filter(Boolean).join(' ');
  };
  updateAreaHint();

  const current = () => toggle.querySelector('input:checked')?.value || 'pickup';
  const apply = () => {
    const delivery = current() === 'delivery';
    const ar = isAr();
    address.hidden = !delivery;
    addressInput.required = delivery;
    root.querySelectorAll('[data-when-label]').forEach((el) => {
      const whenKey = el.dataset.whenLabel;
      if (ar) {
        el.textContent = whenKey === 'date'
          ? (delivery ? 'تاريخ التوصيل' : 'تاريخ الاستلام')
          : (delivery ? 'وقت التوصيل' : 'وقت الاستلام');
      } else {
        el.textContent = `${delivery ? 'Delivery' : 'Pickup'} ${whenKey}`;
      }
    });
    updateAreaHint();
    onChange(current());
  };
  toggle.addEventListener('change', apply);
  window.addEventListener('savory:langchange', apply);
  apply();
  return current;
}

// Fills the branch picker inside `root` (from the fulfillment partial). With one branch it's chosen
// automatically and the picker stays hidden. Returns a function giving the chosen branch (or null).
export async function setupBranches(root, onChange = () => {}) {
  const field = root.querySelector('[data-branch-field]');
  const choices = root.querySelector('[data-branch-choices]');
  let branches = [];
  try {
    branches = await api('/api/branches');
  } catch { /* no picker: the order goes to the shop's main number */ }
  const byId = new Map(branches.map((b) => [String(b.id), b]));
  if (branches.length > 1) {
    choices.innerHTML = branches.map((b) => `
      <label class="choice">
        <input type="radio" name="branch" value="${b.id}" required>
        <span class="name">${esc(tr(b.name))}</span>
        ${b.address ? `<span class="meta">${esc(tr(b.address))}</span>` : ''}
      </label>`).join('');
    field.hidden = false;
    choices.addEventListener('change', () => onChange());
    window.addEventListener('savory:langchange', () => {
      choices.querySelectorAll('.choice').forEach((lbl) => {
        const val = lbl.querySelector('input')?.value;
        const branch = byId.get(String(val));
        const nameEl = lbl.querySelector('.name');
        const metaEl = lbl.querySelector('.meta');
        if (branch && nameEl) nameEl.textContent = tr(branch.name);
        if (branch && metaEl && branch.address) metaEl.textContent = tr(branch.address);
      });
    });
  }
  return () => (branches.length === 1 ? branches[0] : byId.get(root.querySelector('input[name="branch"]:checked')?.value) || null);
}

// wa.me chat link for the shop's WhatsApp number, with an optional pre-filled message.
export function whatsappLink(settings, message = '') {
  const digits = (settings.whatsapp || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function deliveryFee(settings, fulfillment) {
  return fulfillment === 'delivery' ? Number(settings.delivery_fee) || 0 : 0;
}

// ---------- Bilingual Arabic / English (AR / EN) + RTL ----------

const I18N = {
  en: {
    nav_home: 'Cake Studio',
    nav_cakes: '3D Cake Builder',
    nav_menu: 'Menu',
    nav_boxes: 'Gift Boxes',
    nav_cart: 'Cart',
    nav_specialties: 'Specialties',
    nav_gallery: 'Gallery',
    nav_track: 'Track Order',
    nav_about: 'About',
    nav_faq: 'FAQ',
    nav_contact: 'Contact',
    cta_design: 'Design a cake',
    cta_order: 'Your order',
    cta_order_now: 'Browse Menu',
    bc_menu: 'Menu',
    featured_title: 'Featured & Offers',
    categories_heading: 'Choose a Category',
    cart_title: 'Your Cart',
    foot_order: 'Order',
    foot_bakery: 'Bakery',
    foot_visit: 'Visit',
    nav_cakes_short: 'Cakes',
    nav_menu_cafe: 'Chocolates & Café',
    nav_visit: 'Visit',
    cta_order_cake: 'Order a cake',
    cta_see_menu: 'See the menu',
    notice_pay: 'Pay on pickup or delivery',
    foot_shop: 'Shop',
    foot_help: 'Help',
    home_ways: 'Two ways to order',
    home_cakes_title: 'Celebration cakes',
    home_cakes_note: 'Design yours in 3D and we bake it fresh.',
    home_menu_title: 'Chocolates & café',
    home_menu_note: 'Bars, bark, crepes and shakes, for pickup or delivery.',
    home_loved: 'Most loved',
    home_full_menu: 'Full menu',
    home_builder_kicker: 'Cake builder',
    home_builder_title: 'See your cake before we bake it.',
    home_step1: 'Shape, size and tiers',
    home_step2: 'Flavour, filling and frosting',
    home_step3: 'Drip, toppings and your message',
    home_start_designing: 'Start designing',
    home_recent: 'Recent creations',
    home_view_gallery: 'View the gallery',
    home_visit: 'Visit us',
    reels_kicker: 'Live from Instagram',
    reels_title: '@savory.chocolate Reels',
    reels_follow: 'Follow on Instagram',
    hero_dream_sub: 'Every choice updates the live 3D preview. Drag or touch the cake to look around it.',
  },
  ar: {
    nav_home: 'استوديو الكيك',
    nav_cakes: 'صمّم قالبك 3D',
    nav_menu: 'القائمة',
    nav_boxes: 'علب الهدايا',
    nav_cart: 'السلّة',
    nav_specialties: 'أصنافنا',
    nav_gallery: 'المعرض',
    nav_track: 'تتبّع طلبك',
    nav_about: 'قصتنا',
    nav_faq: 'الأسئلة الشائعة',
    nav_contact: 'تواصل معنا',
    cta_design: 'صمّم قالبك',
    cta_order: 'سلّة الطلب',
    cta_order_now: 'تصفّح القائمة',
    bc_menu: 'القائمة',
    featured_title: 'العروض والمميزة',
    categories_heading: 'اختر التصنيف',
    cart_title: 'سلّة التسوّق',
    foot_order: 'الطلب',
    foot_bakery: 'المتجر',
    foot_visit: 'فروعنا',
    nav_cakes_short: 'الكيك',
    nav_menu_cafe: 'الشوكولا والمقهى',
    nav_visit: 'زورونا',
    cta_order_cake: 'اطلب قالب كيك',
    cta_see_menu: 'تصفّح القائمة',
    notice_pay: 'الدفع عند الاستلام أو التوصيل',
    foot_shop: 'المتجر',
    foot_help: 'المساعدة',
    home_ways: 'طريقتان للطلب',
    home_cakes_title: 'كيك المناسبات',
    home_cakes_note: 'صمّم قالبك بتقنية 3D ونخبزه لك طازجاً.',
    home_menu_title: 'الشوكولا والمقهى',
    home_menu_note: 'ألواح، شوكولا بالمكسرات، كريب وميلك شيك، استلام أو توصيل.',
    home_loved: 'الأكثر طلباً',
    home_full_menu: 'القائمة كاملة',
    home_builder_kicker: 'صمّم قالبك',
    home_builder_title: 'شاهد قالبك قبل أن نخبزه.',
    home_step1: 'الشكل والحجم والطبقات',
    home_step2: 'النكهة والحشوة والتغطية',
    home_step3: 'الصوص والزينة ورسالتك',
    home_start_designing: 'ابدأ التصميم',
    home_recent: 'أحدث إبداعاتنا',
    home_view_gallery: 'شاهد المعرض',
    home_visit: 'تفضّل بزيارتنا',
    reels_kicker: 'مباشرة من إنستغرام',
    reels_title: 'فيديوهات @savory.chocolate',
    reels_follow: 'تابعنا على إنستغرام',
    hero_dream_sub: 'كل خيار يحدّث المعاينة ثلاثية الأبعاد مباشرة. اسحب القالب أو المس الشاشة لتدويره.',
  },
};

const PHRASE_AR = new Map([
  ['Made from scratch', 'محضّر يدوياً بعناية'],
  ['Baked to order', 'يُخبز طازجاً عند الطلب'],
  ['Pickup or delivery', 'استلام من الفرع أو توصيل'],
  ['Order from the menu', 'اطلب من القائمة'],
  ['Two ways to order', 'طريقتان للطلب'],
  ['Custom cakes', 'قوالب الكيك المخصّصة'],
  ["Today's menu", 'قائمة اليوم'],
  ['What we make', 'ماذا نُحضّر'],
  ['Signature designs', 'تصاميمنا المميزة'],
  ['Made your way', 'على ذوقك'],
  ['Design every detail', 'صمّم كل تفصيل'],
  ['How it works', 'كيف تطلب'],
  ['Ordering is a piece of cake', 'الطلب ولا أسهل'],
  ['Kind words', 'آراء زبائننا'],
  ['Loved by our customers', 'ثقة ومحبة زبائننا'],
  ['From our kitchen', 'من مطبخنا'],
  ['Recent creations', 'أحدث إبداعاتنا'],
  ['Follow us on Instagram', 'تابعنا على إنستغرام'],
  ['Our story', 'قصتنا'],
  ['Visit us', 'تفضّل بزيارتنا'],
  ['Opening hours', 'ساعات العمل'],
  ['Cut a slice', 'اقطع شريحة'],
  ['Whole cake', 'القالب كاملاً'],
  ['Make a wish', 'تمنَّ أمنية'],
  ['Lights on', 'إضاءة كاملة'],
  ['Atelier light', 'إضاءة دافئة'],
  ['Golden hour', 'إضاءة ذهبية'],
  ['Bright studio', 'إضاءة ساطعة'],
  ['Surprise me', 'فاجئني بتصميم'],
  ['Share 3D link', 'مشاركة الرابط'],
  ['Link copied!', 'تم نسخ الرابط!'],
  ['Save card', 'حفظ الصورة'],
  ['Place cake order', 'تأكيد طلب الكيك'],
  ['Place order', 'تأكيد الطلب'],
  ['Your order', 'طلبك'],
  ['Your Cart', 'سلّة التسوّق'],
  ['Checkout Details', 'تفاصيل الطلب'],
  ['Clear cart', 'إفراغ السلّة'],
  ['Your cart is empty', 'سلّة التسوّق فارغة'],
  ['← Continue Shopping', '← متابعة التسوّق'],
  ['Browse Categories →', 'تصفّح التصنيفات ←'],
  ['← All Categories', '← جميع التصنيفات'],
  ['← Back to Categories', '← العودة للتصنيفات'],
  ['Order Now', 'اطلب الآن'],
  ['Browse Menu', 'تصفّح القائمة'],
  ['Browse menu', 'تصفّح القائمة'],
  ['Featured offers & categories', 'العروض والأصناف المميزة'],
  ['9, 16 or 25-piece luxury boxes', 'علب هدايا فاخرة من 9 أو 16 أو 25 قطعة'],
  ['Review items & checkout', 'مراجعة الأصناف وإتمام الطلب'],
  ['Live kitchen preparation status', 'متابعة حالة تحضير طلبك مباشرة'],
  ['Aramoun & Aley locations', 'فروعنا في عرمون وعاليه'],
  ['SAVORY 3D Custom Studio', 'استوديو SAVORY ثلاثي الأبعاد'],
  ['3D Cake Studio ↗', 'استوديو الكيك 3D ↗'],
  ['Open Daily · Aramoun & Aley', 'نستقبلكم يومياً · عرمون وعاليه'],
  ['WhatsApp Concierge', 'تواصل معنا عبر واتساب'],
  ['Featured & Offers', 'العروض والمميزة'],
  ['Choose a Category', 'اختر التصنيف'],
  ['Track order', 'تتبّع الطلب'],
  ['Curate a gift box →', 'صمّم علبة هدايا ←'],
  ['Curate a gift box', 'صمّم علبة هدايا'],
  ['All Creations', 'كافة الإبداعات'],
  ["★ Chef's Picks", '★ مختارات الشيف'],
  ['Pistachio & Kunafa', 'فستق وكنافة'],
  ['Belgian Dark', 'شوكولاتة داكنة بلجيكية'],
  ['Under $10', 'أقل من 10$'],
  ['Quick-start from a chef preset:', 'ابدأ سريعاً من تصاميم الشيف:'],
  ['Recent orders on this device:', 'طلباتك الأخيرة على هذا الجهاز:'],
  ['Tasting Note', 'ملاحظة التذوّق'],
  ['Richness', 'كثافة النكهة'],
  ['Sweetness', 'درجة الحلاوة'],
  ['✦ Complete your treat', '✦ أكمل تحليتك'],
  ['Add gift box to order', 'إضافة علبة الهدايا للطلب'],
  ['OPEN DAILY', 'يومياً نفتح أبوابنا'],
  ['Wedding & 3-Tier', 'أعراس وتصاميم متعددة الطبقات'],
  ['Chocolate & Pistachio', 'شوكولاتة وفستق'],
  ['Heart & Celebration', 'قلوب ومناسبات خاصة'],
]);

const origTextMap = new WeakMap();
const origPlaceholderMap = new WeakMap();

const origHtmlMap = new WeakMap();

export function applyLanguage(lang = activeLang) {
  const isArabic = lang === 'ar';
  document.documentElement.lang = isArabic ? 'ar' : 'en';
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  const nextLabel = isArabic ? 'EN' : 'عربي';
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) langBtn.textContent = nextLabel;
  const onboardLangBtn = document.getElementById('onboard-lang-btn');
  if (onboardLangBtn) onboardLangBtn.textContent = nextLabel;

  const dict = I18N[isArabic ? 'ar' : 'en'];
  const HTML_AR = {
    hero_dream_cake: 'صمّم <em class="gold-text">قالب أحلامك</em>',
  };
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    if (!origHtmlMap.has(el)) origHtmlMap.set(el, el.innerHTML);
    const k = el.dataset.i18nHtml;
    el.innerHTML = isArabic && HTML_AR[k] ? HTML_AR[k] : origHtmlMap.get(el);
  });

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n;
    if (!dict[k]) return;
    const textSpan = el.querySelector('.nav-text');
    if (textSpan) textSpan.textContent = dict[k];
    else el.textContent = dict[k];
  });

  // The header notice carries the shop's days of notice for cakes.
  document.querySelectorAll('[data-lead-days]').forEach((el) => {
    if (!origTextMap.has(el)) origTextMap.set(el, el.textContent);
    const days = Number(el.dataset.leadDays) || 0;
    if (!isArabic) el.textContent = origTextMap.get(el);
    else {
      const span = days === 1 ? 'يوم' : days === 2 ? 'يومين' : days <= 10 ? `${days} أيام` : `${days} يوماً`;
      el.textContent = days > 0 ? `اطلب قالب الكيك قبل ${span}` : 'اطلب الكيك في اليوم نفسه';
    }
  });

  // Placeholders on search boxes, notes, delivery addresses, and order code inputs
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
    if (!origPlaceholderMap.has(el)) origPlaceholderMap.set(el, el.getAttribute('placeholder') || '');
    const orig = origPlaceholderMap.get(el);
    el.setAttribute('placeholder', isArabic ? tr(orig, true) : orig);
  });

  // Standalone phrase elements
  document.querySelectorAll('.eyebrow, .trust span, .step h3, .section-head h2, .card h2, .card h3, .btn, .cat-back-btn span, dt, .tool-btn span, .menu-filter-pill, .recent-orders-label, .portion-badge, .cart-upsell-head, .occasion-label, #box-ribbon option, .folders-heading, .slider-editorial-sub, .box-banner-copy h2, #open-box-builder span:first-child, .pay-note, .empty-state p, .empty-state h2, .total-row > span:first-child, .optional, .hint, .drawer-hours span:last-child, .drawer-wa-btn span, .sister-sub, .sister-title, .sister-site-pill span, .nav-desc, .site-footer a, .site-footer p, .footer-bottom span, #closed-notice, .portion-calc-top strong, .luxury-badge span:last-child, .builder-step .step-intro, .pip-expand-btn, .stage-hint .drag, .box-flavors-label, .box-size-tab strong, .box-dialog h2, .box-dialog p, .footer-top h4, .luxury-funnel-step strong, .luxury-funnel-step small, .step-head h2, .bottom-bar span:first-child, .preview-meta .muted, #photo-empty strong, .visit .pre-line, .visit dd, .branch-links a, .info-list strong, .footer-branch strong, .footer-branch a, .wa-menu-title, .at-footer-brand p, .at-footer-col p, .at-footer-col a, .at-visit-intro .pre-line, .at-branch h3, .at-branch p, .at-branch a').forEach((el) => {
    if (el.hasAttribute('data-i18n') || el.children.length > 0) return;
    if (!origTextMap.has(el)) origTextMap.set(el, el.textContent);
    const raw = origTextMap.get(el);
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (isArabic) {
      if (/^©\s*\d{4}/.test(trimmed)) {
        el.textContent = '© 2026 SAVORY · جميع الحقوق محفوظة · الدفع عند الاستلام أو التوصيل';
      } else if (/^Website by\s+/i.test(trimmed)) {
        el.textContent = `تصميم ${trimmed.replace(/^Website by\s+/i, '')}`;
      } else {
        const translated = PHRASE_AR.get(trimmed) || tr(trimmed, true);
        if (translated !== trimmed) el.textContent = translated;
      }
    } else {
      el.textContent = raw;
    }
  });

  // Translate leading/inline TextNodes inside composite labels & buttons (e.g. `<label>Full name <span class="optional">(optional)</span></label>`)
  document.querySelectorAll('.field > label, .field > .label, .segmented label, .cart-col-head h2, .box-size-tab, .total-row > span:first-child, .stage-hint, #photo-empty > span, a.credit, .at-footer-bottom a, .wa-menu a span').forEach((el) => {
    if (el.hasAttribute('data-i18n')) return;
    for (const node of el.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      if (!origTextMap.has(node)) origTextMap.set(node, node.nodeValue);
      const orig = origTextMap.get(node);
      const trimmed = orig.trim();
      if (!trimmed) continue;
      if (isArabic) {
        const translated = PHRASE_AR.get(trimmed) || tr(trimmed, true);
        if (translated !== trimmed) {
          node.nodeValue = orig.replace(trimmed, translated);
        }
      } else {
        node.nodeValue = orig;
      }
    }
  });
}

let activeLang = storage.get('sc_lang', 'en');
applyLanguage(activeLang);

function toggleLanguage() {
  activeLang = activeLang === 'ar' ? 'en' : 'ar';
  storage.set('sc_lang', activeLang);
  applyLanguage(activeLang);
  window.dispatchEvent(new CustomEvent('savory:langchange', { detail: { lang: activeLang } }));
}

document.getElementById('lang-toggle')?.addEventListener('click', toggleLanguage);
document.getElementById('onboard-lang-btn')?.addEventListener('click', toggleLanguage);

// ---------- Page chrome ----------

// Lock viewport scale: prevent pinch-zoom and double-tap zoom on iOS & Android
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => {
  if (e.touches && e.touches.length > 1) e.preventDefault();
}, { passive: false });

const header = document.getElementById('site-header');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

const toggle = document.getElementById('nav-toggle');
const siteNav = document.getElementById('site-nav');
if (toggle && siteNav) {
  const closeBtn = document.getElementById('drawer-close');
  const setOpen = (open) => {
    const wasOpen = document.body.classList.contains('nav-open');
    document.documentElement.classList.toggle('nav-open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open && !wasOpen && closeBtn) {
      requestAnimationFrame(() => closeBtn.focus({ preventScroll: true }));
    } else if (!open && wasOpen && siteNav.contains(document.activeElement)) {
      toggle.focus({ preventScroll: true });
    }
  };
  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
  siteNav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  closeBtn?.addEventListener('click', () => setOpen(false));
  document.getElementById('nav-scrim')?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

// Highlight matching static page link across multi-page routes when not controlled by the Menu SPA.
if (siteNav && !document.getElementById('view-onboarding')) {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const slug = path === '/' ? 'home' : path.slice(1).split('/')[0];
  siteNav.querySelectorAll('[data-page]').forEach((link) => {
    if (link.dataset.page === slug) link.setAttribute('aria-current', 'page');
  });
}

// Cards with .spotlight glow where the cursor is.
let spotFrame = 0;
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || spotFrame) return;
  spotFrame = requestAnimationFrame(() => {
    spotFrame = 0;
    const card = e.target.closest?.('.spotlight');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  });
}, { passive: true });

// Splits a heading into words that rise in one after another. The last `accent` words turn gold.
export function splitHeadline(el, { accent = 1 } = {}) {
  if (!el) return;
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.classList.add('split');
  el.innerHTML = words.map((word, i) => {
    const gold = i >= words.length - accent ? ' class="gold-text accent"' : '';
    return `<span class="w" aria-hidden="true"><span${gold} style="--i:${i}">${esc(word)}</span></span>`;
  }).join(' ');
}

// Fades sections in as they scroll into view. Call again after adding new [data-reveal] elements.
const revealer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  : null;

export function reveal(root = document) {
  const items = root.querySelectorAll('[data-reveal]:not(.is-visible)');
  items.forEach((el, idx) => {
    if (!el.style.getPropertyValue('--delay') && idx > 0 && el.parentElement?.children.length > 1) {
      const siblingIdx = [...el.parentElement.children].indexOf(el);
      if (siblingIdx > 0 && siblingIdx < 8) {
        el.style.setProperty('--delay', `${(siblingIdx * 0.055).toFixed(3)}s`);
      }
    }
    if (revealer) revealer.observe(el);
    else el.classList.add('is-visible');
  });
}

reveal();

// Floating WhatsApp button with a branch menu (when the shop has more than one branch).
const waMenu = document.querySelector('[data-wa-menu]');
if (waMenu) {
  const button = waMenu.querySelector('.wa-float');
  const menu = waMenu.querySelector('.wa-menu');
  const setOpen = (open) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(menu.hidden));
  document.addEventListener('click', (e) => { if (!waMenu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

const WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.04c0-5.22 4.25-9.46 9.48-9.46a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.69c0 5.22-4.25 9.47-9.47 9.47zm8.06-17.53A11.33 11.33 0 0 0 12.04.62C5.76.62.65 5.73.65 12.01c0 2 .52 3.96 1.52 5.69L.55 23.6l6.03-1.58a11.36 11.36 0 0 0 5.45 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.33-8.05z"/></svg>';

const RECENT_ORDERS_KEY = 'sc_recent_orders_v1';
const CUSTOMER_PREFS_KEY = 'sc_customer_prefs_v1';

export function saveCustomerPrefs({ customer_name, customer_phone, customer_email, delivery_address, fulfillment, branch } = {}) {
  const clean = {
    name: String(customer_name || '').trim(),
    phone: String(customer_phone || '').trim(),
    email: String(customer_email || '').trim(),
    address: String(delivery_address || '').trim(),
    fulfillment: fulfillment === 'delivery' ? 'delivery' : 'pickup',
    branch: branch ? String(branch) : '',
  };
  if (clean.name || clean.phone || clean.address) {
    storage.set(CUSTOMER_PREFS_KEY, clean);
  }
}

export function restoreCustomerPrefs(form) {
  if (!form) return;
  const prefs = storage.get(CUSTOMER_PREFS_KEY, null);
  if (!prefs) return;
  if (form.customer_name && !form.customer_name.value && prefs.name) form.customer_name.value = prefs.name;
  if (form.customer_phone && !form.customer_phone.value && prefs.phone) form.customer_phone.value = prefs.phone;
  if (form.customer_email && !form.customer_email.value && prefs.email) form.customer_email.value = prefs.email;
  if (form.delivery_address && !form.delivery_address.value && prefs.address) form.delivery_address.value = prefs.address;
  if (prefs.branch) {
    const branchInput = form.querySelector(`input[name="branch"][value="${CSS.escape(prefs.branch)}"]`);
    if (branchInput && !form.querySelector('input[name="branch"]:checked')) {
      branchInput.checked = true;
      branchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  if (prefs.fulfillment === 'delivery') {
    const delRadio = form.querySelector('input[name="fulfillment"][value="delivery"]');
    if (delRadio && !delRadio.closest('[data-fulfillment]')?.hidden && !delRadio.checked) {
      delRadio.checked = true;
      delRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

/** Wires an optional `[data-promo-box]` inside a checkout form via `/api/promo/validate`. */
export function setupPromoField(form, { getSubtotal, onChange = () => {} }) {
  const box = form?.querySelector('[data-promo-box]');
  if (!box) {
    return {
      getCode: () => '',
      getDiscountCents: () => 0,
      revalidate: async () => {},
      clear: () => {},
      rowHtml: () => '',
    };
  }

  const input = box.querySelector('[data-promo-input]');
  const applyBtn = box.querySelector('[data-promo-apply]');
  const clearBtn = box.querySelector('[data-promo-clear]');
  const msgEl = box.querySelector('[data-promo-msg]');

  let applied = null; // { code, percent, discountCents }

  const showMsg = (text, isErr = false) => {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.classList.toggle('is-error', Boolean(isErr));
    msgEl.hidden = !text;
  };

  const syncButtons = () => {
    const ar = isAr();
    if (applyBtn) {
      applyBtn.hidden = Boolean(applied);
      applyBtn.textContent = ar ? 'تطبيق' : 'Apply';
    }
    if (clearBtn) {
      clearBtn.hidden = !applied;
      clearBtn.textContent = ar ? 'إزالة' : 'Remove';
    }
    if (input) {
      input.readOnly = Boolean(applied);
      input.setAttribute('placeholder', ar ? 'كود الخصم (مثال: SAVORY10)' : 'Promo code (e.g. SAVORY10)');
    }
    if (applied) {
      const sub = getSubtotal();
      const disc = Math.min(sub, Math.round((sub * applied.percent) / 100));
      applied.discountCents = disc;
      showMsg(
        ar ? `✓ تم تطبيق كود ${applied.code} (خصم ${applied.percent}% · -${money(disc)})` : `✓ ${applied.code} applied (${applied.percent}% off · -${money(disc)})`,
        false,
      );
    }
  };

  async function validateAndApply(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    const ar = isAr();
    if (!code) {
      showMsg(ar ? 'أدخل كود الخصم أولاً.' : 'Enter a promo code first.', true);
      return;
    }
    const subtotal = getSubtotal();
    if (applyBtn) applyBtn.disabled = true;
    try {
      const res = await api('/api/promo/validate', {
        method: 'POST',
        body: { code, subtotal_cents: subtotal },
      });
      applied = { code: res.code, percent: res.percent, discountCents: res.discountCents };
      if (input) input.value = applied.code;
      syncButtons();
      onChange();
    } catch {
      applied = null;
      syncButtons();
      showMsg(ar ? 'كود الخصم غير صالح أو منتهي الصلاحية.' : 'Promo code is invalid or expired.', true);
      onChange();
    } finally {
      if (applyBtn) applyBtn.disabled = false;
    }
  }

  function clear() {
    applied = null;
    if (input) {
      input.value = '';
      input.readOnly = false;
    }
    showMsg('', false);
    syncButtons();
    onChange();
  }

  applyBtn?.addEventListener('click', () => validateAndApply(input?.value));
  clearBtn?.addEventListener('click', clear);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!applied) validateAndApply(input.value);
    }
  });
  window.addEventListener('savory:langchange', () => {
    syncButtons();
    if (!applied && msgEl && !msgEl.hidden) showMsg('', false);
  });
  syncButtons();

  return {
    getCode: () => applied?.code || '',
    getPercent: () => applied?.percent || 0,
    getDiscountCents: (subtotal = getSubtotal()) => (
      applied ? Math.min(subtotal, Math.round((subtotal * applied.percent) / 100)) : 0
    ),
    revalidate: () => {
      syncButtons();
    },
    clear,
    rowHtml: (subtotal = getSubtotal()) => {
      if (!applied) return '';
      const disc = Math.min(subtotal, Math.round((subtotal * applied.percent) / 100));
      if (disc <= 0) return '';
      const label = isAr()
        ? `خصم (${applied.code} · ${applied.percent}%)`
        : `Promo (${applied.code} · ${applied.percent}% off)`;
      return `<div class="sum-row sum-row-discount"><span>${esc(label)}</span><span dir="ltr">−${money(disc)}</span></div>`;
    },
  };
}

export function getRecentOrders() {
  return storage.get(RECENT_ORDERS_KEY, []);
}

export function rememberOrderCode(code, label = '', extra = {}) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return;
  const currentList = getRecentOrders();
  const prev = currentList.find((o) => o.code === clean);
  const nextEntry = {
    ...(prev || {}),
    ...(extra && typeof extra === 'object' ? extra : {}),
    code: clean,
    label: label || prev?.label || 'SAVORY Order',
    ts: Date.now(),
  };
  const list = [nextEntry, ...currentList.filter((o) => o.code !== clean)];
  storage.set(RECENT_ORDERS_KEY, list.slice(0, 5));
  syncHeaderOrderPill();
}

function syncHeaderOrderPill() {
  const pill = document.getElementById('header-order-pill');
  if (!pill) return;
  const recent = getRecentOrders()[0];
  if (!recent?.code) {
    pill.hidden = true;
    return;
  }
  const baseHref = pill.getAttribute('href')?.includes('site=menu')
    ? `/track?site=menu&code=${encodeURIComponent(recent.code)}`
    : `/track?code=${encodeURIComponent(recent.code)}`;
  pill.href = baseHref;
  pill.innerHTML = `<span class="choco-live-dot" aria-hidden="true"></span><span>${esc(recent.code)}</span>`;
  pill.hidden = false;
}

syncHeaderOrderPill();

// The screen after an order is placed. Its main action sends the order to the branch on WhatsApp
// (the message is written by the server, with every detail of the order).
export function orderConfirmation(order, { name, title, shopName, links = '', recentMeta = null }) {
  rememberOrderCode(order.code || order.order_code, title, recentMeta || {});
  const firstName = name.trim().split(/\s+/)[0];
  const delivery = order.fulfillment === 'delivery';
  const ar = isAr();
  const branchName = ar ? tr(order.branch, true) : order.branch;
  const to = [shopName, branchName].filter(Boolean).join(' ');
  const localizedTitle = ar ? (title.includes('cake') ? 'طلب الكيك الخاص بك جاهز للإرسال' : 'تم تسجيل طلبك بنجاح') : title;
  const promoLine = order.discount_cents > 0 && order.promo_code
    ? (ar ? `<br><strong>الخصم (${esc(order.promo_code)}):</strong> <span dir="ltr">−${money(order.discount_cents)}</span>` : `<br><strong>Promo (${esc(order.promo_code)}):</strong> −${money(order.discount_cents)}`)
    : '';

  if (ar) {
    return `
      <div class="card confirm">
        <span class="script" style="font-size: 2.4rem;">شكراً لك</span>
        <h1 style="font-size: 2.2rem;">${esc(firstName)}، ${esc(localizedTitle)}</h1>
        ${order.whatsapp_url ? `
          <div class="wa-step">
            <span class="wa-step-label">الخطوة الأخيرة</span>
            <p>أرسل طلبك إلى <strong>${esc(to || 'فرعنا')}</strong> عبر واتساب لنتمكن من تأكيده. الرسالة جاهزة بالفعل.</p>
            <a class="btn btn-lg btn-block wa-send" href="${esc(order.whatsapp_url)}" target="_blank" rel="noopener">${WA_SVG} أرسل الطلب عبر واتساب</a>
          </div>` : ''}
        <p class="muted">رقم طلبك هو</p>
        <div class="order-code" dir="ltr">${esc(order.code)}</div>
        <p>${branchName ? `<strong>الفرع:</strong> ${esc(branchName)}<br>` : ''}
          <strong>${delivery ? 'التوصيل' : 'الاستلام'}:</strong> ${esc(friendlyDate(order.pickup_date))} · ${esc(friendlyTime(order.pickup_time))}
          ${delivery ? `<br><span class="muted">${esc(order.delivery_address)}</span>` : ''}${promoLine}<br>
          <strong>الإجمالي المطلوب عند ${delivery ? 'التوصيل' : 'الاستلام'}:</strong> <span dir="ltr">${money(order.total_cents)}</span></p>
        <div class="hero-actions" style="justify-content: center; margin-top: 24px;">${links}</div>
      </div>`;
  }

  return `
    <div class="card confirm">
      <span class="script" style="font-size: 2.4rem;">Thank you</span>
      <h1 style="font-size: 2.4rem;">${esc(firstName)}, ${esc(title)}</h1>
      ${order.whatsapp_url ? `
        <div class="wa-step">
          <span class="wa-step-label">Last step</span>
          <p>Send your order to <strong>${esc(to || 'us')}</strong> on WhatsApp so we can confirm it. The message is already written for you.</p>
          <a class="btn btn-lg btn-block wa-send" href="${esc(order.whatsapp_url)}" target="_blank" rel="noopener">${WA_SVG} Send order on WhatsApp</a>
        </div>` : ''}
      <p class="muted">Your order number is</p>
      <div class="order-code">${esc(order.code)}</div>
      <p>${order.branch ? `<strong>Branch:</strong> ${esc(order.branch)}<br>` : ''}
        <strong>${delivery ? 'Delivery' : 'Pickup'}:</strong> ${esc(friendlyDate(order.pickup_date))} at ${esc(friendlyTime(order.pickup_time))}
        ${delivery ? `<br><span class="muted">${esc(order.delivery_address)}</span>` : ''}${promoLine}<br>
        <strong>Total due on ${delivery ? 'delivery' : 'pickup'}:</strong> ${money(order.total_cents)}</p>
      <div class="hero-actions" style="justify-content: center; margin-top: 24px;">${links}</div>
    </div>`;
}

// Opens the WhatsApp message straight away. Browsers may block this, which is why the
// confirmation also has a big "Send order on WhatsApp" button.
export function openWhatsApp(url) {
  if (!url) return;
  const tab = window.open(url, '_blank');
  if (tab) {
    try { tab.opener = null; } catch { /* cross-origin already */ }
  }
}

// Progressive Web App (PWA) Service Worker Registration
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => {});
  });
}
