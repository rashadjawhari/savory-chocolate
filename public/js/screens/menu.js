import {
  api, esc, mediaSrc, money, storage, isoDate, loadSettings, setupFulfillment, deliveryFee, reveal,
  setupBranches, orderConfirmation, openWhatsApp, applyLanguage, tr, isAr,
  saveCustomerPrefs, restoreCustomerPrefs, setupPromoField, getRecentOrders,
} from '/js/common.js';
import { buildItemSearchIndex, normalizeSearchText, trPairNote } from '/js/i18n-ar.js';
import { illustrationFor } from '/js/illustrations.js';
import { confetti } from '/js/confetti.js';
import { playClick, playPop, playCelebration } from '/js/audio.js';
import { mountReelsStrip } from '/js/social-reels.js';

const CART_KEY = 'sc_cart_v2';

const BOX_TIERS = {
  9: { size: 9, cols: 3, name: 'SAVORY 9-Piece Assorted Gift Box', price_cents: 1800 },
  16: { size: 16, cols: 4, name: 'SAVORY 16-Piece Luxury Gift Box', price_cents: 3000 },
  25: { size: 25, cols: 5, name: 'SAVORY 25-Piece Grand Selection Box', price_cents: 4500 },
};

const TRUFFLES = [
  { id: 'pistachio', name: 'Pistachio Kunafa', color: '#96bc61', accent: '#d9b066' },
  { id: 'hazelnut', name: 'Hazelnut Praline', color: '#5c2c12', accent: '#e3c184' },
  { id: 'caramel', name: 'Salted Caramel', color: '#c67d2d', accent: '#4C2007' },
  { id: 'dark70', name: '70% Dark Ganache', color: '#2b1206', accent: '#d9b066' },
  { id: 'lotus', name: 'Lotus Speculoos', color: '#b56e33', accent: '#f6ead8' },
  { id: 'raspberry', name: 'Raspberry Velvet', color: '#8c1832', accent: '#f4b6c2' },
  { id: 'espresso', name: 'Arabic Coffee Roast', color: '#3b1c0c', accent: '#c9a063' },
  { id: 'white', name: 'Almond Blanc', color: '#f3dfba', accent: '#7A3912' },
];

const CATEGORY_META = {
  'Signature Gateaux & Bakes': {
    desc: 'Hand-finished whole tortes, molten lava bakes, and signature chocolate creations.',
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19h16"/><path d="M5 19v-5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><path d="M8 12V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/></svg>`,
  },
  'Chocolates & Bark': {
    desc: 'Artisan bonbons, pistachio kunafa bars, and hand-broken roasted nut barks.',
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>`,
  },
  'Crepes & Waffles': {
    desc: 'Warm golden crepes and crispy waffles drenched in Belgian milk and dark couverture.',
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18c0-5 3.5-9 8-9s8 4 8 9"/><path d="M3 18h18"/><path d="M12 9v9"/><path d="M8 11.5v6.5"/><path d="M16 11.5v6.5"/></svg>`,
  },
  'Savory Flurry & Shakes': {
    desc: 'Handcrafted velvety soft serve flurries and decadent thick shakes.',
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l-2 13a4 4 0 0 1-4 4 4 4 0 0 1-4-4L6 3z"/><path d="M10 21h4"/><line x1="6" y1="8" x2="18" y2="8"/></svg>`,
  },
  'Cakes by the slice': {
    desc: 'Decadent chocolate fudge slices, spiced carrot cakes, and patisserie slices.',
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l18-8v8H3z"/><path d="M3 17l6-9 12 1"/><line x1="3" y1="17" x2="21" y2="17"/></svg>`,
  },
  Bakes: {
    desc: 'Freshly baked Belgian chocolate brownies, chewy cookies, and afternoon treats.',
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="15" r="1.5" fill="currentColor"/><circle cx="14" cy="14" r="1.5" fill="currentColor"/></svg>`,
  },
  Drinks: {
    desc: 'Signature warm Belgian hot chocolate, iced beverages, and specialty roasts.',
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
  },
};

const DEFAULT_CATEGORY_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

function isVideoSlide(slide) {
  return slide?.media_type === 'video' || /\.(mp4|webm|mov)(\?.*)?$/i.test(String(slide?.media_url || ''));
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------- DOM References ----------
const viewOnboarding = document.getElementById('view-onboarding');
const onboardingBg = document.getElementById('onboarding-bg');
const onboardingSlogan = document.getElementById('onboarding-slogan');
const onboardingCaption = document.getElementById('onboarding-caption');
const onboardingDots = document.getElementById('onboarding-dots');
const onboardCartBtn = document.getElementById('onboard-cart-btn');
const onboardCartCount = document.getElementById('onboard-cart-count');

const storefrontShell = document.getElementById('storefront-shell');
const visitSection = document.getElementById('visit-section');

const viewMenu = document.getElementById('view-menu');
const viewCategory = document.getElementById('view-category');
const viewProduct = document.getElementById('view-product');
const viewCart = document.getElementById('view-cart');
const viewSearch = document.getElementById('view-search');

const featuredSliderEl = document.getElementById('featured-slider');
const sliderViewport = document.getElementById('slider-viewport');
const sliderTrack = document.getElementById('slider-track');
const sliderPrev = document.getElementById('slider-prev');
const sliderNext = document.getElementById('slider-next');
const sliderDots = document.getElementById('slider-dots');

const categoriesSection = document.getElementById('categories-section');
const boxBanner = document.getElementById('box-banner');
const menuReelsSection = document.getElementById('menu-reels-section');
const menuReelsGrid = document.getElementById('menu-reels-grid');

const breadcrumb = document.getElementById('menu-breadcrumb');
const bcSepCat = document.getElementById('bc-sep-cat');
const bcCat = document.getElementById('bc-cat');
const bcSepProd = document.getElementById('bc-sep-prod');
const bcProd = document.getElementById('bc-prod');

const foldersGrid = document.getElementById('folders-grid');
const categoryRowsList = document.getElementById('category-rows-list');
const searchRowsList = document.getElementById('search-rows-list');
const productPageCard = document.getElementById('product-page-card');

const catBannerTitle = document.getElementById('cat-banner-title');
const catBannerDesc = document.getElementById('cat-banner-desc');
const catBannerIcon = document.getElementById('cat-banner-icon');
const catBackBtn = document.getElementById('cat-back-btn');
const catPillsNav = document.getElementById('cat-pills-nav');
const catProductsCount = document.getElementById('cat-products-count');

const prodBackBtn = document.getElementById('prod-back-btn');
const prodBackCatName = document.getElementById('prod-back-cat-name');
const prodHeaderBadge = document.getElementById('prod-header-badge');

const searchInput = document.getElementById('menu-search');
const searchClear = document.getElementById('menu-search-clear');
const filterPills = document.getElementById('menu-filter-pills');
const clearSearchBtn = document.getElementById('clear-search-btn');
const searchTitle = document.getElementById('search-title');

const headerCartBtn = document.getElementById('header-cart-btn');
const headerCartCount = document.getElementById('header-cart-count');
const clearCartBtn = document.getElementById('clear-cart-btn');
const cartConfirmation = document.getElementById('cart-confirmation');
const cartEmpty = document.getElementById('cart-empty');
const cartContent = document.getElementById('cart-content');
const cartItemsCountLabel = document.getElementById('cart-items-count-label');
const cartLinesEl = document.getElementById('cart-lines');

const form = document.getElementById('checkout-form');
const submitBtn = document.getElementById('submit-btn');
const errorBox = document.getElementById('form-error');

let dataLoaded = false;
let userLeftOnboardingEarly = false;
let onboardIdx = 0;
let onboardTimer = null;
let onboardSlideEls = [];
let onboardDotEls = [];
let currentCategory = null;
let currentProduct = null;
let currentProductPicks = [];
let currentProductQty = 1;

function pauseOnboardingMedia() {
  clearTimeout(onboardTimer);
  onboardTimer = null;
  onboardSlideEls.forEach((el) => el.querySelector('video')?.pause());
  onboardingBg?.querySelectorAll('video').forEach((v) => v.pause());
}

function navigateToMenuHome() {
  if (window.location.hash !== '#menu') {
    window.location.hash = '#menu';
  }
  if (dataLoaded) {
    showMenuHomeView();
  } else {
    userLeftOnboardingEarly = true;
    enterStorefrontShell({ isCart: false, showVisit: true });
    if (foldersGrid) {
      foldersGrid.innerHTML = '<div class="menu-loading"><span class="spinner" aria-hidden="true"></span> Loading menu…</div>';
    }
  }
}

document.getElementById('order-now-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  navigateToMenuHome();
});

// Avoid onboarding flash on direct deep-link navigation (e.g. /#menu, /#category/..., /#cart).
const initialHash = window.location.hash.trim();
if (initialHash && initialHash !== '#welcome') {
  document.body.classList.remove('is-onboarding');
  if (viewOnboarding) viewOnboarding.hidden = true;
  if (storefrontShell) storefrontShell.hidden = false;
  pauseOnboardingMedia();
  if (initialHash === '#cart') {
    document.body.classList.add('is-cart-page');
    [viewMenu, viewCategory, viewProduct, viewCart].forEach((el) => {
      if (el) el.hidden = el.id !== 'view-cart';
    });
  }
}

// ---------- Parallel Data Fetch ----------
const [settings, loadedItems, loadedOffers, loadedSlides] = await Promise.all([
  loadSettings(),
  api('/api/menu').catch((err) => {
    if (foldersGrid) foldersGrid.innerHTML = `<p class="alert alert-error">${esc(err.message)}</p>`;
    return [];
  }),
  api('/api/offers').catch(() => []),
  api('/api/onboarding').catch(() => []),
]);

const items = Array.isArray(loadedItems) ? loadedItems : [];
items.forEach((it) => { it._searchIdx = buildItemSearchIndex(it); });
const offers = Array.isArray(loadedOffers) ? loadedOffers : [];
const onboardingSlides = Array.isArray(loadedSlides) ? loadedSlides : [];
const itemsById = new Map(items.map((i) => [i.id, i]));

const ordersOpen = settings.orders_open !== '0';
if (!ordersOpen) {
  const closedNotice = document.getElementById('closed-notice');
  if (closedNotice) closedNotice.hidden = false;
  if (submitBtn) submitBtn.disabled = true;
}

if (form?.pickup_date) {
  form.pickup_date.min = isoDate(0);
  form.pickup_date.max = isoDate(180);
  form.pickup_date.value = isoDate(0);
}

// ---------- Option & Pricing Helpers ----------

function picksValid(item, picks) {
  if (!Array.isArray(picks) || picks.length !== item.options.length) return false;
  return item.options.every((g, gi) => {
    const p = picks[gi];
    if (!Array.isArray(p) || p.some((i) => !Number.isInteger(i) || i < 0 || i >= g.choices.length)) return false;
    if (g.type === 'single' && p.length > 1) return false;
    return !(g.required && p.length === 0);
  });
}

function unitPrice(item, picks) {
  return item.price_cents + item.options.reduce((sum, g, gi) => sum + (picks[gi] || []).reduce((s, i) => s + g.choices[i].price_cents, 0), 0);
}

function picksText(item, picks) {
  return item.options.flatMap((g, gi) => (picks[gi] || []).map((i) => tr(g.choices[i].name))).join(' · ');
}

function fromPrice(item) {
  return item.price_cents + item.options
    .filter((g) => g.required)
    .reduce((sum, g) => sum + Math.min(...g.choices.map((c) => c.price_cents)), 0);
}

function inferMenuBadges(item) {
  const text = `${item.name} ${item.description} ${item.category}`.toLowerCase();
  const badges = [];
  if (item.offer_badge) {
    badges.push({ label: item.offer_badge, cls: 'badge-chef' });
  } else if (/lava|mirror|kunafa|gift box|fettuccine|flurry/i.test(text)) {
    badges.push({ label: "★ Chef's Pick", cls: 'badge-chef' });
  }
  if (/pistachio|kunafa|hazelnut|praline|almond|pecan|nut/i.test(text)) {
    badges.push({ label: 'Nuts & Praline', cls: 'badge-nut' });
  }
  if (/70%|dark|ganache|mirror|truffle|bark/i.test(text)) {
    badges.push({ label: 'Belgian Cocoa', cls: 'badge-dark' });
  }
  if (/lava|warm|crepe|waffle|molten|brownie/i.test(text)) {
    badges.push({ label: 'Served Warm', cls: 'badge-warm' });
  } else if (/flurry|shake|ice cream|chilled/i.test(text)) {
    badges.push({ label: 'Chilled', cls: 'badge-chill' });
  }
  return badges.slice(0, 3);
}

function inferAllergens(item) {
  const txt = `${item.name} ${item.description} ${item.category} ${(item.options || []).map((g) => g.choices.map((c) => c.name).join(' ')).join(' ')}`.toLowerCase();
  const ar = isAr();
  const list = [];
  if (/cream|milk|cheese|butter|gelato|ice cream|flurry|shake|latte|hot chocolate|crepe|waffle|pancake|eclair|éclair|brioche|caramel|white chocolate|ganache/.test(txt)) {
    list.push(ar ? 'الحليب' : 'Dairy');
  }
  if (/crepe|waffle|pancake|cake|brownie|cookie|roll|kataifi|kunafa|eclair|éclair|choux|biscoff|oreo/.test(txt)) {
    list.push(ar ? 'القمح / الغلوتين' : 'Wheat / Gluten');
  }
  if (/pistachio|hazelnut|almond|praline|cashew|nut|ferrero/.test(txt)) {
    list.push(ar ? 'المكسرات (فستق/بندق/لوز)' : 'Tree Nuts');
  }
  if (/crepe|waffle|pancake|cake|brownie|cookie|eclair|éclair/.test(txt)) {
    list.push(ar ? 'البيض' : 'Egg');
  }
  return list;
}

function inferPairing(item) {
  const text = `${item.name} ${item.category}`.toLowerCase();
  if (/crepe|waffle|lava|brownie/.test(text)) {
    return 'Enjoy warm with a scoop of Madagascar vanilla gelato or double espresso.';
  }
  if (/flurry|shake/.test(text)) {
    return 'Pairs effortlessly with a warm Belgian chocolate brownie or pistachio kunafa bar.';
  }
  if (/box|praline|truffle|bark/.test(text)) {
    return 'Hand-tempered for gifting — pairs beautifully with roasted Arabic coffee.';
  }
  return 'Freshly crafted to order in our Aramoun & Aley kitchens.';
}

// ---------- Screen 0: Cinematic Onboarding Controller ----------

if (onboardingSlogan) {
  onboardingSlogan.textContent = settings.slogan || 'Where every bite is a Savory moment';
}

const activeOnboardingSlides = onboardingSlides.length
  ? onboardingSlides
  : [{ media_type: 'video', media_url: '/img/social/reel-dubai-crepe.mp4', caption: 'Dubai Chocolate Crepe · @savory.chocolate' }];

function posterForVideo(srcUrl) {
  return /\/img\/social\/reel-[^/?#]+\.(mp4|webm|mov)(\?.*)?$/i.test(srcUrl)
    ? srcUrl.replace(/\.(mp4|webm|mov)(\?.*)?$/i, '.webp')
    : '/img/social/reel-dubai-crepe.webp';
}

function ensureVideoPlaying(vid) {
  if (!vid) return;
  vid.muted = true;
  vid.defaultMuted = true;
  vid.loop = true;
  vid.autoplay = true;
  vid.playsInline = true;
  const attempt = () => { vid.play().catch(() => {}); };
  if (vid.readyState >= 2) {
    attempt();
  } else {
    vid.addEventListener('canplay', attempt, { once: true });
    attempt();
  }
}

function buildOnboardingVideo(srcUrl, eager = false) {
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('loop', '');
  video.preload = eager ? 'auto' : 'metadata';
  video.poster = posterForVideo(srcUrl);
  video.src = srcUrl;
  return video;
}

function setupOnboardingMedia() {
  if (!onboardingBg) return;
  const initialWrap = onboardingBg.querySelector('[data-initial-video]');
  const initialVid = initialWrap?.querySelector('video');
  const firstSlide = activeOnboardingSlides[0];
  const firstSrc = mediaSrc(firstSlide?.media_url);
  const canReuseInitial = Boolean(
    initialWrap && initialVid && isVideoSlide(firstSlide)
    && initialVid.getAttribute('src') === firstSrc,
  );

  if (canReuseInitial) {
    onboardingBg.querySelectorAll('.onboarding-slide:not([data-initial-video])').forEach((el) => el.remove());
  } else {
    onboardingBg.innerHTML = '';
  }

  onboardSlideEls = activeOnboardingSlides.map((slide, i) => {
    const srcUrl = mediaSrc(slide.media_url);
    if (i === 0 && canReuseInitial) {
      initialWrap.className = 'onboarding-slide is-active';
      initialVid.poster = posterForVideo(srcUrl);
      ensureVideoPlaying(initialVid);
      return initialWrap;
    }

    const wrap = document.createElement('div');
    wrap.className = `onboarding-slide${i === 0 ? ' is-active' : ''}`;
    if (isVideoSlide(slide)) {
      const video = buildOnboardingVideo(srcUrl, i <= 1);
      video.addEventListener('error', () => {
        const fallback = document.createElement('img');
        fallback.src = posterForVideo(srcUrl);
        fallback.alt = '';
        wrap.innerHTML = '';
        wrap.append(fallback);
      }, { once: true });
      wrap.append(video);
    } else {
      const img = document.createElement('img');
      img.src = srcUrl;
      img.alt = '';
      img.decoding = 'async';
      wrap.append(img);
    }
    onboardingBg.append(wrap);
    return wrap;
  });

  if (onboardingDots) {
    onboardingDots.innerHTML = activeOnboardingSlides.length > 1
      ? activeOnboardingSlides.map((_, i) => `
          <button type="button" class="onboarding-dot${i === 0 ? ' is-active' : ''}" data-onboard-slide="${i}" aria-label="Show highlight ${i + 1}"></button>
        `).join('')
      : '';
    onboardDotEls = [...onboardingDots.querySelectorAll('.onboarding-dot')];
  }
}

function setOnboardingSlide(nextIdx, { preservePlaying = false } = {}) {
  if (!onboardSlideEls.length) return;
  onboardIdx = ((nextIdx % onboardSlideEls.length) + onboardSlideEls.length) % onboardSlideEls.length;
  const upcomingIdx = (onboardIdx + 1) % onboardSlideEls.length;

  if (onboardingBg) {
    onboardingBg.style.transition = '';
    onboardingBg.style.transform = `translate3d(-${onboardIdx * 100}%, 0, 0)`;
  }

  onboardSlideEls.forEach((el, i) => {
    const active = i === onboardIdx;
    el.classList.toggle('is-active', active);
    const vid = el.querySelector('video');
    if (!vid) return;
    if (i === upcomingIdx && vid.preload !== 'auto') vid.preload = 'auto';
    if (active && document.body.classList.contains('is-onboarding') && !document.hidden) {
      vid.preload = 'auto';
      if (!(preservePlaying && !vid.paused) && vid.readyState >= 1) {
        vid.currentTime = 0;
      }
      ensureVideoPlaying(vid);
    } else {
      vid.pause();
    }
  });

  onboardDotEls.forEach((dot, i) => {
    dot.classList.toggle('is-active', i === onboardIdx);
  });

  if (onboardingCaption) {
    onboardingCaption.textContent = activeOnboardingSlides[onboardIdx]?.caption || '';
  }

  scheduleOnboardingAdvance();
}

function scheduleOnboardingAdvance() {
  clearTimeout(onboardTimer);
  onboardTimer = null;
  if (
    activeOnboardingSlides.length <= 1
    || !document.body.classList.contains('is-onboarding')
    || document.hidden
    || reducedMotion()
  ) {
    return;
  }
  const current = activeOnboardingSlides[onboardIdx];
  const delay = isVideoSlide(current) ? 8500 : 5000;
  onboardTimer = setTimeout(() => {
    setOnboardingSlide(onboardIdx + 1);
  }, delay);
}

function resumeOnboardingMedia() {
  if (!onboardSlideEls.length) return;
  setOnboardingSlide(onboardIdx, { preservePlaying: true });
}

onboardingDots?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-onboard-slide]');
  if (!btn) return;
  e.stopPropagation();
  setOnboardingSlide(Number(btn.dataset.onboardSlide));
});

document.getElementById('onboard-prev')?.addEventListener('click', (e) => {
  e.stopPropagation();
  setOnboardingSlide(onboardIdx - 1);
});

document.getElementById('onboard-next')?.addEventListener('click', (e) => {
  e.stopPropagation();
  setOnboardingSlide(onboardIdx + 1);
});

document.addEventListener('keydown', (e) => {
  if (!document.body.classList.contains('is-onboarding') || onboardSlideEls.length <= 1) return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    setOnboardingSlide(onboardIdx - 1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    setOnboardingSlide(onboardIdx + 1);
  }
});

// Touch swipe & pointer drag left/right on onboarding video stage
let onboardTouchStartX = 0;
let onboardTouchStartY = 0;
let onboardTouchDeltaX = 0;
let onboardTouchActive = false;

const startOnboardingDrag = (clientX, clientY, target) => {
  if (target?.closest?.('a, button') || onboardSlideEls.length <= 1) return;
  onboardTouchStartX = clientX;
  onboardTouchStartY = clientY;
  onboardTouchDeltaX = 0;
  onboardTouchActive = true;
  clearTimeout(onboardTimer);
};

const moveOnboardingDrag = (clientX, clientY) => {
  if (!onboardTouchActive || !onboardingBg) return;
  const dx = clientX - onboardTouchStartX;
  const dy = clientY - onboardTouchStartY;
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(onboardTouchDeltaX) < 10) {
    onboardTouchActive = false;
    return;
  }
  onboardTouchDeltaX = dx;
  if (Math.abs(dx) > 6) {
    onboardingBg.style.transition = 'none';
    onboardingBg.style.transform = `translate3d(calc(-${onboardIdx * 100}% + ${dx}px), 0, 0)`;
  }
};

const finishOnboardingSwipe = () => {
  if (!onboardTouchActive) return;
  onboardTouchActive = false;
  const dx = onboardTouchDeltaX;
  onboardTouchDeltaX = 0;
  if (onboardingBg) onboardingBg.style.transition = '';
  if (dx < -32) {
    setOnboardingSlide(onboardIdx + 1);
  } else if (dx > 32) {
    setOnboardingSlide(onboardIdx - 1);
  } else {
    setOnboardingSlide(onboardIdx, { preservePlaying: true });
  }
};

viewOnboarding?.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  if (t) startOnboardingDrag(t.clientX, t.clientY, e.target);
}, { passive: true });

viewOnboarding?.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (t) moveOnboardingDrag(t.clientX, t.clientY);
}, { passive: true });

viewOnboarding?.addEventListener('touchend', finishOnboardingSwipe, { passive: true });
viewOnboarding?.addEventListener('touchcancel', finishOnboardingSwipe, { passive: true });

viewOnboarding?.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') return;
  startOnboardingDrag(e.clientX, e.clientY, e.target);
});

viewOnboarding?.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || !onboardTouchActive) return;
  moveOnboardingDrag(e.clientX, e.clientY);
});

viewOnboarding?.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'touch') return;
  finishOnboardingSwipe();
});
viewOnboarding?.addEventListener('pointercancel', finishOnboardingSwipe);

setupOnboardingMedia();

// ---------- Screen 1: Featured Items & Admin Offers Carousel Slider ----------

const sliderSlides = [
  ...offers.map((offer) => ({ kind: 'offer', data: offer })),
  ...items.filter((m) => Number(m.featured) === 1).map((item) => ({ kind: 'item', data: item })),
];

let sliderIdx = 0;
let sliderTimer = null;
let sliderHoverPaused = false;

function buildSliderCard(entry) {
  if (entry.kind === 'offer') {
    const o = entry.data;
    const targetProduct = o.target_type === 'product' ? itemsById.get(Number(o.target_value)) : null;

    let actionAttr = 'data-slider-href="#categories-section"';
    if (o.target_type === 'product' && targetProduct) {
      actionAttr = `data-open-product="${targetProduct.id}"`;
    } else if (o.target_type === 'category' && o.target_value) {
      actionAttr = `data-slider-href="#category/${encodeURIComponent(o.target_value)}"`;
    } else if (o.target_type === 'box') {
      actionAttr = `data-open-offer-box="${esc(o.target_value || '9')}"`;
    }

    const label = tr(o.title);
    const visualHtml = o.image
      ? `<img src="${esc(mediaSrc(o.image))}" alt="${esc(label)}" loading="eager" decoding="async">`
      : targetProduct
        ? illustrationFor(targetProduct)
        : `<img src="/img/onboarding-box.webp" alt="${esc(label)}" loading="eager" decoding="async">`;

    return `
      <article class="slider-slide" role="button" tabindex="0" ${actionAttr} aria-label="${esc(label)}">
        <div class="slider-slide-media">
          ${visualHtml}
        </div>
        <div class="slider-slide-copy">
          <h3>${esc(label)}</h3>
          ${targetProduct ? `<span class="slider-live-price" dir="ltr">${money(targetProduct.price_cents)}</span>` : ''}
        </div>
      </article>`;
  }

  const item = entry.data;
  const from = item.options.length && fromPrice(item) !== item.price_cents;
  const displayPrice = from ? fromPrice(item) : item.price_cents;
  const itemLabel = tr(item.name);

  return `
    <article class="slider-slide" role="button" tabindex="0" data-open-product="${item.id}" aria-label="${esc(itemLabel)}">
      <div class="slider-slide-media">
        ${item.image ? `<img src="${esc(mediaSrc(item.image))}" alt="${esc(itemLabel)}" loading="eager" decoding="async">` : illustrationFor(item)}
      </div>
      <div class="slider-slide-copy">
        <h3>${esc(itemLabel)}</h3>
        <span class="slider-live-price" dir="ltr">${money(displayPrice)}</span>
      </div>
    </article>`;
}

function getSliderStepPx() {
  const firstSlide = sliderTrack?.querySelector('.slider-slide');
  if (!firstSlide) return 240;
  const style = window.getComputedStyle(sliderTrack);
  const gap = parseFloat(style.columnGap || style.gap || '18') || 18;
  return firstSlide.getBoundingClientRect().width + gap;
}

function setSliderIndex(idx) {
  if (!sliderSlides.length || !sliderTrack) return;
  sliderIdx = ((idx % sliderSlides.length) + sliderSlides.length) % sliderSlides.length;
  const stepPx = getSliderStepPx();
  sliderTrack.style.transition = '';
  sliderTrack.style.transform = `translate3d(-${sliderIdx * stepPx}px, 0, 0)`;
  sliderDots?.querySelectorAll('.slider-dot').forEach((d, i) => {
    const active = i === sliderIdx;
    d.classList.toggle('is-active', active);
    d.setAttribute('aria-selected', String(active));
  });
}

function stopSliderAutoplay() {
  clearInterval(sliderTimer);
  sliderTimer = null;
}

function startSliderAutoplay() {
  stopSliderAutoplay();
  if (
    sliderSlides.length <= 1
    || sliderHoverPaused
    || document.hidden
    || document.body.classList.contains('is-onboarding')
    || viewMenu?.hidden
    || !viewSearch?.hidden
    || reducedMotion()
  ) {
    return;
  }
  sliderTimer = setInterval(() => {
    setSliderIndex(sliderIdx + 1);
  }, 5500);
}

function initFeaturedSlider() {
  if (!featuredSliderEl || !sliderTrack) return;
  if (!sliderSlides.length) {
    featuredSliderEl.hidden = true;
    return;
  }

  featuredSliderEl.hidden = false;
  sliderTrack.innerHTML = sliderSlides.map(buildSliderCard).join('');

  const hasMultiple = sliderSlides.length > 1;
  if (sliderPrev) sliderPrev.hidden = !hasMultiple;
  if (sliderNext) sliderNext.hidden = !hasMultiple;
  if (sliderDots) {
    sliderDots.hidden = !hasMultiple;
    sliderDots.innerHTML = hasMultiple
      ? sliderSlides.map((_, i) => `
          <button type="button" class="slider-dot${i === 0 ? ' is-active' : ''}" data-slider-dot="${i}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}" aria-label="Slide ${i + 1}">${String(i + 1).padStart(2, '0')}</button>
        `).join('')
      : '';
  }

  setSliderIndex(0);
}

sliderPrev?.addEventListener('click', (e) => {
  e.stopPropagation();
  setSliderIndex(sliderIdx - 1);
  startSliderAutoplay();
});
sliderNext?.addEventListener('click', (e) => {
  e.stopPropagation();
  setSliderIndex(sliderIdx + 1);
  startSliderAutoplay();
});
sliderDots?.addEventListener('click', (e) => {
  const dot = e.target.closest('[data-slider-dot]');
  if (!dot) return;
  e.stopPropagation();
  setSliderIndex(Number(dot.dataset.sliderDot));
  startSliderAutoplay();
});

window.addEventListener('resize', () => {
  if (sliderSlides.length > 1 && !viewMenu?.hidden) {
    setSliderIndex(sliderIdx);
  }
}, { passive: true });

featuredSliderEl?.addEventListener('mouseenter', () => { sliderHoverPaused = true; stopSliderAutoplay(); });
featuredSliderEl?.addEventListener('mouseleave', () => { sliderHoverPaused = false; startSliderAutoplay(); });
featuredSliderEl?.addEventListener('focusin', () => { sliderHoverPaused = true; stopSliderAutoplay(); });
featuredSliderEl?.addEventListener('focusout', () => { sliderHoverPaused = false; startSliderAutoplay(); });

// Smooth touch & pointer drag support on slider viewport
let swipeStartX = 0;
let swipeStartY = 0;
let swipeDeltaX = 0;
let swipeDragging = false;

sliderViewport?.addEventListener('touchstart', (e) => {
  if (sliderSlides.length <= 1) return;
  const t = e.touches[0];
  if (!t) return;
  swipeStartX = t.clientX;
  swipeStartY = t.clientY;
  swipeDeltaX = 0;
  swipeDragging = true;
  stopSliderAutoplay();
}, { passive: true });

sliderViewport?.addEventListener('touchmove', (e) => {
  if (!swipeDragging || !sliderTrack) return;
  const t = e.touches[0];
  if (!t) return;
  const dx = t.clientX - swipeStartX;
  const dy = t.clientY - swipeStartY;
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(swipeDeltaX) < 10) {
    swipeDragging = false;
    return;
  }
  swipeDeltaX = dx;
  if (Math.abs(dx) > 6) {
    const basePx = sliderIdx * getSliderStepPx();
    sliderTrack.style.transition = 'none';
    sliderTrack.style.transform = `translate3d(${-basePx + dx}px, 0, 0)`;
  }
}, { passive: true });

const finishSliderSwipe = () => {
  if (!swipeDragging) return;
  swipeDragging = false;
  const dx = swipeDeltaX;
  swipeDeltaX = 0;
  if (sliderTrack) sliderTrack.style.transition = '';
  if (dx < -34) {
    setSliderIndex(sliderIdx + 1);
  } else if (dx > 34) {
    setSliderIndex(sliderIdx - 1);
  } else {
    setSliderIndex(sliderIdx);
  }
  startSliderAutoplay();
};

sliderViewport?.addEventListener('touchend', finishSliderSwipe, { passive: true });
sliderViewport?.addEventListener('touchcancel', finishSliderSwipe, { passive: true });

initFeaturedSlider();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseOnboardingMedia();
    stopSliderAutoplay();
  } else {
    if (document.body.classList.contains('is-onboarding')) resumeOnboardingMedia();
    else startSliderAutoplay();
  }
});

// ---------- Cart State & Persistence ----------

const lineKey = (id, picks, customBox = null, note = '') => (
  customBox ? `box:${JSON.stringify(customBox)}` : `${id}:${JSON.stringify(picks)}:${note}`
);

let cart = storage.get(CART_KEY, [])
  .filter((l) => {
    if (l.custom_box) return Boolean(BOX_TIERS[Number(l.custom_box.size)]) && l.quantity > 0;
    return itemsById.has(l.id) && l.quantity > 0 && picksValid(itemsById.get(l.id), l.picks);
  })
  .map((l) => {
    const cleanNote = l.custom_box ? '' : String(l.note || '').trim();
    return { ...l, note: cleanNote, key: lineKey(l.id, l.picks, l.custom_box, cleanNote) };
  });

function saveCart() {
  storage.set(CART_KEY, cart.map(({ id, quantity, picks, custom_box, note }) => {
    if (custom_box) return { quantity, custom_box };
    return note ? { id, quantity, picks, note } : { id, quantity, picks };
  }));
}

function lineUnitPrice(line) {
  if (line.custom_box) return BOX_TIERS[Number(line.custom_box.size)]?.price_cents || 1800;
  return unitPrice(itemsById.get(line.id), line.picks);
}

function lineDisplay(line) {
  const ar = isAr();
  if (line.custom_box) {
    const tier = BOX_TIERS[Number(line.custom_box.size)] || BOX_TIERS[9];
    const counts = new Map();
    for (const p of line.custom_box.pieces || []) counts.set(p, (counts.get(p) || 0) + 1);
    const summary = [...counts.entries()].map(([n, c]) => `${c}× ${tr(n)}`).join(ar ? '، ' : ', ');
    const parts = [summary];
    if (line.custom_box.ribbon) parts.push(`${ar ? 'الشريط' : 'Ribbon'}: ${tr(line.custom_box.ribbon)}`);
    if (line.custom_box.note) parts.push(`${ar ? 'البطاقة' : 'Card'}: “${line.custom_box.note}”`);
    return { name: tr(tier.name), extras: parts.filter(Boolean).join(' · ') };
  }
  const item = itemsById.get(line.id);
  return { name: tr(item.name), extras: picksText(item, line.picks) };
}

function flyToCart(from) {
  if (!from || reducedMotion()) return;
  const bar = document.getElementById('cart-bar');
  const barVisible = bar && bar.classList.contains('show') && getComputedStyle(bar).display !== 'none';
  const target = barVisible ? bar : headerCartBtn;
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width || !b.width) return;

  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const x1 = b.left + Math.min(b.width / 2, 120);
  const y1 = b.top + Math.min(b.height / 2, 40);
  const dot = document.createElement('div');
  dot.className = 'fly-dot';
  document.body.append(dot);
  dot.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1)` },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 140}px) scale(1.25)`, offset: 0.45 },
    { transform: `translate(${x1}px, ${y1}px) scale(0.35)`, opacity: 0.3 },
  ], { duration: 700, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }).onfinish = () => {
    dot.remove();
    target.classList.remove('bump');
    void target.offsetWidth;
    target.classList.add('bump');
  };
  setTimeout(() => dot.remove(), 1400);
}

function addToCart(id, picks, quantity, from = null, customBox = null, note = '') {
  playPop();
  const cleanNote = customBox ? '' : String(note || '').trim();
  const key = lineKey(id, picks, customBox, cleanNote);
  const line = cart.find((l) => l.key === key);
  if (line) line.quantity = Math.min(99, line.quantity + quantity);
  else cart.push({ key, id, picks, quantity, custom_box: customBox, note: cleanNote });
  if (cartConfirmation) {
    cartConfirmation.hidden = true;
    cartConfirmation.innerHTML = '';
  }
  saveCart();
  renderCart();
  flyToCart(from);
}

function changeLine(key, delta) {
  playClick();
  const line = cart.find((l) => l.key === key);
  if (!line) return;
  line.quantity = Math.min(99, line.quantity + delta);
  if (line.quantity <= 0) cart = cart.filter((l) => l !== line);
  saveCart();
  renderCart();
}

function removeLine(key) {
  playClick();
  cart = cart.filter((l) => l.key !== key);
  saveCart();
  renderCart();
}

function stepper(key, qty, name) {
  return `
    <span class="qty">
      <button type="button" data-dec="${esc(key)}" aria-label="Remove one ${esc(name)}">−</button>
      <span aria-live="polite">${qty}</span>
      <button type="button" data-inc="${esc(key)}" aria-label="Add one more ${esc(name)}">+</button>
    </span>`;
}

// ---------- Cart Page & Chrome Rendering ----------

let fulfillment = () => 'pickup';
let promo = null;

function cartSubtotalCents() {
  return cart.reduce((sum, l) => sum + l.quantity * lineUnitPrice(l), 0);
}

function reorderFromHistory(orderCode) {
  const rec = getRecentOrders().find((o) => o.code === String(orderCode || '').trim().toUpperCase());
  if (!rec?.items?.length) return false;
  let added = 0;
  for (const line of rec.items) {
    const qty = Math.max(1, Number(line.quantity) || 1);
    if (line.custom_box && BOX_TIERS[Number(line.custom_box.size)]) {
      addToCart(0, [], qty, null, line.custom_box, '');
      added++;
    } else if (line.id) {
      const item = itemsById.get(Number(line.id));
      const picks = Array.isArray(line.choices) ? line.choices : [];
      if (item && picksValid(item, picks)) {
        addToCart(item.id, picks, qty, null, null, line.note || '');
        added++;
      }
    }
  }
  if (!added) return false;
  playPop();
  if (cartConfirmation) cartConfirmation.hidden = true;
  renderCart();
  return true;
}

function renderRecentReorderBar() {
  const el = document.getElementById('cart-recent-reorder');
  if (!el) return;
  const recentMenu = getRecentOrders().filter((o) => o.type === 'menu' && Array.isArray(o.items) && o.items.length);
  const confirmationVisible = Boolean(cartConfirmation && !cartConfirmation.hidden);
  if (!recentMenu.length || confirmationVisible) {
    el.hidden = true;
    return;
  }
  const ar = isAr();
  el.hidden = false;
  el.innerHTML = `
    <span class="recent-orders-label">${ar ? 'إعادة طلب سريعة من طلباتك السابقة:' : 'Quick reorder from your last orders:'}</span>
    <div class="recent-orders-pills">
      ${recentMenu.map((o) => {
        const totalItems = o.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
        const suffix = ar ? `${totalItems} ${totalItems === 1 ? 'صنف' : 'أصناف'} · أعد الطلب ↻` : `${totalItems} item${totalItems === 1 ? '' : 's'} · Reorder ↻`;
        return `<button type="button" class="recent-order-chip" data-reorder-code="${esc(o.code)}"><strong>${esc(o.code)}</strong> <span>${esc(suffix)}</span></button>`;
      }).join('')}
    </div>`;
}

document.getElementById('cart-recent-reorder')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-reorder-code]');
  if (!btn) return;
  reorderFromHistory(btn.dataset.reorderCode);
});

function renderCartThumb(line) {
  if (line.custom_box) {
    return `
      <div class="cart-box-mini" aria-hidden="true">
        <span style="background:#4C2007"></span>
        <span style="background:#96bc61"></span>
        <span style="background:#d9b066"></span>
        <span style="background:#c67d2d"></span>
      </div>`;
  }
  const item = itemsById.get(line.id);
  if (!item) return '';
  if (item.image) return `<img src="${esc(mediaSrc(item.image))}" alt="${esc(item.name)}" loading="lazy" decoding="async">`;
  return illustrationFor(item);
}

function renderCart() {
  const ar = isAr();
  const count = cart.reduce((n, l) => n + l.quantity, 0);
  const subtotal = cartSubtotalCents();
  const discount = promo ? promo.getDiscountCents(subtotal) : 0;
  const fee = deliveryFee(settings, fulfillment());
  const finalTotal = Math.max(0, subtotal - discount) + fee;
  const confirmationVisible = Boolean(cartConfirmation && !cartConfirmation.hidden);
  renderRecentReorderBar();

  // Sync header badge & onboarding utility cart pill
  if (headerCartCount) {
    const prevCount = Number(headerCartCount.dataset.prevCount || '0');
    headerCartCount.textContent = String(count);
    headerCartCount.hidden = count === 0;
    if (count > prevCount) {
      headerCartCount.classList.remove('is-pop');
      void headerCartCount.offsetWidth;
      headerCartCount.classList.add('is-pop');
    }
    headerCartCount.dataset.prevCount = String(count);
  }
  if (onboardCartBtn && onboardCartCount) {
    onboardCartCount.textContent = String(count);
    onboardCartBtn.hidden = count === 0;
  }
  if (clearCartBtn) {
    clearCartBtn.hidden = count === 0 || confirmationVisible;
  }
  if (cartItemsCountLabel) {
    cartItemsCountLabel.textContent = count
      ? (ar ? `(${count} ${count === 1 ? 'صنف' : 'أصناف'})` : `(${count} item${count === 1 ? '' : 's'})`)
      : '';
  }

  // Also refresh product page inline View Cart pill if open
  const prodViewCartBtn = document.getElementById('prod-view-cart-btn');
  if (prodViewCartBtn && count > 0) {
    prodViewCartBtn.textContent = ar ? `عرض السلّة (${count}) ←` : `View Cart (${count}) →`;
  }

  if (cartEmpty) cartEmpty.hidden = count > 0 || confirmationVisible;
  if (cartContent) cartContent.hidden = count === 0 || confirmationVisible;

  if (cartLinesEl) {
    cartLinesEl.innerHTML = cart.map((l) => {
      const { name, extras } = lineDisplay(l);
      return `
        <li class="cart-line-item">
          <div class="cart-line-thumb">
            ${renderCartThumb(l)}
          </div>
          <div class="cart-line-info">
            <div class="cart-line-head">
              <span class="name" dir="auto">${esc(name)}</span>
              <span class="line-total" dir="ltr">${money(lineUnitPrice(l) * l.quantity)}</span>
            </div>
            ${extras ? `<div class="choices" dir="auto">${esc(extras)}</div>` : ''}
            ${l.note ? `<div class="cart-line-note" dir="auto">${ar ? 'ملاحظة' : 'Note'}: “${esc(l.note)}”</div>` : ''}
            <div class="cart-line-actions">
              ${stepper(l.key, l.quantity, name)}
              <button type="button" class="cart-remove-btn" data-remove-line="${esc(l.key)}" aria-label="${ar ? 'حذف' : 'Remove'} ${esc(name)}">${ar ? 'حذف' : 'Remove'}</button>
            </div>
          </div>
        </li>`;
    }).join('');
  }

  const upsellEl = document.getElementById('cart-upsell');
  if (upsellEl && ordersOpen) {
    const inCartIds = new Set(cart.filter((l) => !l.custom_box).map((l) => l.id));
    const candidates = items.filter((it) => !inCartIds.has(it.id) && !it.options.some((g) => g.required));
    const picks = candidates.slice(0, 2);
    if (picks.length && count > 0) {
      upsellEl.hidden = false;
      upsellEl.innerHTML = `
        <div class="cart-upsell-head">${ar ? '✦ أكمل تحليتك' : '✦ Complete your treat'}</div>
        <div class="cart-upsell-list">
          ${picks.map((u) => `
            <div class="cart-upsell-item">
              <div class="cart-upsell-info">
                <strong>${esc(tr(u.name))}</strong>
                <span dir="ltr">${money(u.price_cents)}</span>
              </div>
              <button type="button" class="btn btn-outline btn-sm" data-add-quick="${u.id}">${ar ? '+ أضف' : '+ Add'}</button>
            </div>
          `).join('')}
        </div>`;
    } else {
      upsellEl.hidden = true;
      upsellEl.innerHTML = '';
    }
  }

  promo?.revalidate();
  const sumRows = document.getElementById('sum-rows');
  if (sumRows) {
    const promoHtml = promo ? promo.rowHtml(subtotal) : '';
    const needBreakdown = discount > 0 || fee > 0;
    sumRows.innerHTML = needBreakdown
      ? `<div class="sum-row"><span>${ar ? 'المجموع الفرعي' : 'Subtotal'}</span><span dir="ltr">${money(subtotal)}</span></div>
         ${promoHtml}
         ${fee ? `<div class="sum-row"><span>${ar ? 'التوصيل' : 'Delivery'}</span><span dir="ltr">${money(fee)}</span></div>` : ''}`
      : '';
  }
  const cartTotalEl = document.getElementById('cart-total');
  if (cartTotalEl) cartTotalEl.textContent = money(finalTotal);

  const bar = document.getElementById('cart-bar');
  if (bar) {
    bar.classList.toggle('show', count > 0);
    const barCount = document.getElementById('cart-bar-count');
    const barTotal = document.getElementById('cart-bar-total');
    if (barCount) {
      barCount.textContent = ar
        ? `عرض السلّة · ${count} ${count === 1 ? 'صنف' : 'أصناف'}`
        : `View cart · ${count} item${count === 1 ? '' : 's'}`;
    }
    if (barTotal) barTotal.textContent = money(finalTotal);
  }
}

clearCartBtn?.addEventListener('click', () => {
  playClick();
  cart = [];
  saveCart();
  renderCart();
});

// ---------- Stage & Screen Router Helpers ----------

function syncNavHighlight(activeKey) {
  document.querySelectorAll('#site-nav [data-nav-target]').forEach((link) => {
    if (link.dataset.navTarget === activeKey) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function triggerStageAnimation(el, className = 'is-stage-enter') {
  if (!el || reducedMotion()) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function applyCardStagger(container, selector) {
  if (!container) return;
  container.querySelectorAll(selector).forEach((card, idx) => {
    card.style.setProperty('--stagger-i', String(Math.min(idx, 12)));
  });
}

function enterStorefrontShell({ isCart = false, showVisit = false, navKey = null } = {}) {
  document.body.classList.remove('is-onboarding');
  document.body.classList.toggle('is-cart-page', isCart);
  if (viewOnboarding) viewOnboarding.hidden = true;
  if (storefrontShell) storefrontShell.hidden = false;
  if (visitSection) visitSection.hidden = !showVisit;
  pauseOnboardingMedia();
  syncNavHighlight(navKey || (isCart ? 'cart' : 'menu'));
}

function enterOnboardingScreen() {
  document.body.classList.add('is-onboarding');
  document.body.classList.remove('is-cart-page');
  if (viewOnboarding) viewOnboarding.hidden = false;
  if (storefrontShell) storefrontShell.hidden = true;
  stopSliderAutoplay();
  resumeOnboardingMedia();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/** Pause any active Instagram Reel videos and reset card playing state when leaving the grid. */
function pauseGridReels() {
  if (!menuReelsSection) return;
  menuReelsSection.querySelectorAll('video').forEach((v) => {
    try { v.pause(); } catch {}
  });
  menuReelsSection.querySelectorAll('.reel-card.is-playing').forEach((card) => {
    card.classList.remove('is-playing');
  });
}

function switchStageView(targetId, { scrollTop = true, animate = true } = {}) {
  [viewMenu, viewCategory, viewProduct, viewCart].forEach((el) => {
    if (!el) return;
    const isTarget = el.id === targetId;
    el.hidden = !isTarget;
    if (isTarget && animate) triggerStageAnimation(el);
  });

  if (targetId === 'view-menu') {
    startSliderAutoplay();
  } else {
    stopSliderAutoplay();
    pauseGridReels();
  }

  if (scrollTop) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

function updateBreadcrumbs(state) {
  if (!breadcrumb) return;

  if (state.view === 'menu' || state.view === 'cart' || state.view === 'onboarding' || state.view === 'product') {
    breadcrumb.hidden = true;
    return;
  }

  breadcrumb.hidden = false;

  if (state.view === 'category') {
    bcSepCat.hidden = false;
    bcCat.hidden = false;
    bcCat.textContent = tr(state.category);
    bcCat.href = `#category/${encodeURIComponent(state.category)}`;
    bcCat.classList.add('bc-current');
    bcSepProd.hidden = true;
    bcProd.hidden = true;
    bcProd.textContent = '';
  }
}

// ---------- Screen 1: Inside Menu Home (Slider + Search + Categories) ----------

function getCategoryMap() {
  const categories = new Map();
  for (const item of items) {
    if (!categories.has(item.category)) categories.set(item.category, []);
    categories.get(item.category).push(item);
  }
  return categories;
}

function pickCategoryImage(catItems, usedImgs) {
  const uniqueMatch = catItems.find((i) => i.image && !usedImgs.has(i.image));
  const picked = uniqueMatch?.image || catItems.find((i) => i.image)?.image || '';
  if (picked) usedImgs.add(picked);
  return picked;
}

function showMenuHomeView({ scrollTarget = null, scrollTop = true, navKey = 'menu' } = {}) {
  enterStorefrontShell({ isCart: false, showVisit: true, navKey });
  setSearchModeUI(false);

  if (foldersGrid) {
    const categories = getCategoryMap();
    const usedImgs = new Set();
    const cardsHtml = [...categories.entries()].map(([catName, catItems]) => {
      const meta = CATEGORY_META[catName] || {
        desc: 'Handcrafted atelier specialties and gourmet recipes.',
        icon: DEFAULT_CATEGORY_ICON,
      };
      const catImg = pickCategoryImage(catItems, usedImgs);
      const catLabel = tr(catName);
      const visualHtml = catImg
        ? `<img src="${esc(mediaSrc(catImg))}" alt="${esc(catLabel)}" loading="lazy" decoding="async">`
        : `<div class="folder-icon">${meta.icon}</div>`;
      return `
        <a class="folder-card" href="#category/${encodeURIComponent(catName)}" data-nav-cat="${esc(catName)}">
          <div class="folder-card-head">
            <h3 class="folder-title">${esc(catLabel)}</h3>
          </div>
          <div class="folder-visual">
            ${visualHtml}
          </div>
        </a>`;
    }).join('');

    const boxCardHtml = `
      <a class="folder-card folder-card-bespoke" href="#gift-box" id="folder-box-builder">
        <div class="folder-card-head">
          <h3 class="folder-title">${esc(tr('Luxury Gift Boxes'))}</h3>
        </div>
        <div class="folder-visual">
          <div class="folder-icon folder-icon-bespoke">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M3 12h18"/><path d="M12 8C10.5 5 8 5 8 6.5s2 1.5 4 1.5c2 0 4 0 4-1.5S13.5 5 12 8z"/></svg>
          </div>
        </div>
      </a>`;

    foldersGrid.innerHTML = cardsHtml + boxCardHtml;
    applyCardStagger(foldersGrid, '.folder-card');
  }

  updateBreadcrumbs({ view: 'menu' });
  switchStageView('view-menu', { scrollTop: !scrollTarget && scrollTop });
  applyLanguage();

  if (scrollTarget) {
    requestAnimationFrame(() => {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

// ---------- Screen 2: Category Products List ----------

function renderRowCard(item) {
  const from = item.options.length && fromPrice(item) !== item.price_cents;
  const displayPrice = from ? fromPrice(item) : item.price_cents;
  const label = tr(item.name);
  const visualHtml = item.image
    ? `<img src="${esc(mediaSrc(item.image))}" alt="${esc(label)}" loading="lazy" decoding="async">`
    : `<div class="row-card-icon">${illustrationFor(item)}</div>`;

  return `
    <article class="menu-row-card" data-open-product="${item.id}" role="button" tabindex="0" aria-label="${esc(label)}">
      <div class="row-card-head">
        <h3 class="row-card-title" dir="auto">${esc(label)}</h3>
        <span class="row-card-price" dir="ltr">${money(displayPrice)}</span>
      </div>
      <div class="row-card-visual">
        ${visualHtml}
      </div>
    </article>`;
}

function renderCategoryPills(activeCat) {
  if (!catPillsNav) return;
  const categories = [...getCategoryMap().keys()];
  catPillsNav.innerHTML = [
    ...categories.map((cat) => `
      <a href="#category/${encodeURIComponent(cat)}" class="cat-pill${cat === activeCat ? ' active' : ''}">${esc(tr(cat))}</a>
    `),
    `<a href="#gift-box" class="cat-pill cat-pill-box">${isAr() ? '✦ علب الهدايا' : '✦ Gift Boxes'}</a>`,
  ].join('');

  const activePill = catPillsNav.querySelector('.cat-pill.active');
  if (activePill) {
    const left = activePill.offsetLeft - Math.max(0, (catPillsNav.clientWidth - activePill.offsetWidth) / 2);
    catPillsNav.scrollLeft = Math.max(0, left);
  }
}

function showCategoryView(catName) {
  const catItems = items.filter((i) => i.category === catName);
  if (!catItems.length) {
    window.location.hash = '#menu';
    return;
  }
  currentCategory = catName;
  enterStorefrontShell({ isCart: false, showVisit: false });

  const meta = CATEGORY_META[catName] || {
    desc: 'Handcrafted atelier specialties and gourmet recipes.',
    icon: DEFAULT_CATEGORY_ICON,
  };

  if (catBannerTitle) catBannerTitle.textContent = tr(catName);
  if (catBannerDesc) catBannerDesc.textContent = tr(meta.desc);
  if (catBannerIcon) catBannerIcon.innerHTML = meta.icon;
  if (catProductsCount) {
    catProductsCount.textContent = isAr()
      ? `${catItems.length} ${catItems.length === 1 ? 'صنف متوفر' : 'أصناف متوفرة'} للطلب`
      : `${catItems.length} creation${catItems.length === 1 ? '' : 's'} available to order`;
  }

  renderCategoryPills(catName);
  if (categoryRowsList) {
    categoryRowsList.innerHTML = catItems.map(renderRowCard).join('');
    applyCardStagger(categoryRowsList, '.menu-row-card');
  }

  updateBreadcrumbs({ view: 'category', category: catName });
  switchStageView('view-category');
  applyLanguage();
}

// ---------- Screen 3: Dedicated Product Page ----------

function showProductView(productId) {
  const item = itemsById.get(Number(productId));
  if (!item) {
    window.location.hash = '#menu';
    return;
  }

  enterStorefrontShell({ isCart: false, showVisit: false });

  currentProduct = item;
  currentCategory = item.category;
  currentProductQty = 1;

  currentProductPicks = item.options.map((g) => {
    if (g.type === 'single' && g.required && g.choices.length > 0) return [0];
    return [];
  });

  const ar = isAr();
  if (prodBackCatName) prodBackCatName.textContent = tr(item.category);

  const showCompare = item.compare_price_cents > item.price_cents;

  const optionsHtml = item.options.map((g, gi) => {
    const isSingle = g.type === 'single';
    const note = g.required ? tr('Required') : tr('Optional');

    if (isSingle) {
      return `
        <div class="option-group-box">
          <div class="option-group-title">
            <span dir="auto">${esc(tr(g.name))}</span>
            <span class="option-group-req">${esc(note)}</span>
          </div>
          <div class="variant-bubbles-wrap">
            ${!g.required ? `
              <button type="button" class="variant-bubble-btn ${currentProductPicks[gi].length === 0 ? 'active' : ''}" data-bubble-group="${gi}" data-bubble-choice="-1">
                ${esc(tr('None'))}
              </button>` : ''}
            ${g.choices.map((c, ci) => `
              <button type="button" class="variant-bubble-btn ${currentProductPicks[gi].includes(ci) ? 'active' : ''}" data-bubble-group="${gi}" data-bubble-choice="${ci}" dir="auto">
                <span>${esc(tr(c.name))}</span>${c.price_cents ? ` <span dir="ltr">(+${money(c.price_cents)})</span>` : ''}
              </button>`).join('')}
          </div>
        </div>`;
    }

    return `
      <div class="option-group-box">
        <div class="option-group-title">
          <span dir="auto">${esc(tr(g.name))}</span>
          <span class="option-group-req">${esc(note)}</span>
        </div>
        <div class="addon-options-list">
          ${g.choices.map((c, ci) => `
            <label class="addon-option-row">
              <span class="addon-option-left">
                <input type="checkbox" data-addon-group="${gi}" data-addon-choice="${ci}" ${currentProductPicks[gi].includes(ci) ? 'checked' : ''}>
                <span class="addon-option-name" dir="auto">${esc(tr(c.name))}</span>
              </span>
              <span class="addon-option-price" dir="ltr">${c.price_cents ? `+${money(c.price_cents)}` : tr('Included')}</span>
            </label>`).join('')}
        </div>
      </div>`;
  }).join('');

  const itemTitle = tr(item.name);
  const itemDesc = tr(item.description);
  const allergens = inferAllergens(item);
  const pairingText = trPairNote(inferPairing(item));

  productPageCard.innerHTML = `
    <div class="product-page-grid">
      <div class="product-page-visual">
        ${item.image ? `<img src="${esc(mediaSrc(item.image))}" alt="${esc(itemTitle)}" loading="eager" fetchpriority="high" decoding="async">` : illustrationFor(item)}
      </div>

      <div class="product-page-body">
        <div class="product-page-head">
          <h1 class="product-page-title" dir="auto">${esc(itemTitle)}</h1>
          <div class="product-page-price-row" dir="ltr">
            <span class="product-live-price" id="prod-live-price">${money(unitPrice(item, currentProductPicks) * currentProductQty)}</span>
            ${showCompare ? `<del class="product-compare-price">${money(item.compare_price_cents)}</del>` : ''}
          </div>
        </div>

        ${item.description ? `<p class="product-page-desc" dir="auto">${esc(itemDesc)}</p>` : ''}

        <div class="product-meta-notes">
          ${allergens.length ? `<div class="product-meta-line"><strong>${ar ? 'مسبّبات الحساسية' : 'Contains'}:</strong> ${esc(allergens.join(ar ? '، ' : ', '))}</div>` : ''}
          <div class="product-meta-line">${esc(pairingText)}</div>
        </div>

        <div id="product-options-root">
          ${optionsHtml}
        </div>

        <div class="option-group-box option-group-note">
          <label for="prod-note-input" class="option-group-title">
            <span>${esc(tr('Special Requests'))}</span>
            <span class="option-group-req">${esc(tr('Optional'))}</span>
          </label>
          <input type="text" id="prod-note-input" dir="auto" maxlength="200" placeholder="${esc(tr('Allergies, packaging notes, or special requests…'))}">
        </div>

        <div class="product-page-actions">
          <div class="qty product-qty" dir="ltr">
            <button type="button" id="prod-qty-dec" aria-label="Decrease quantity">−</button>
            <span id="prod-qty-display" aria-live="polite">1</span>
            <button type="button" id="prod-qty-inc" aria-label="Increase quantity">+</button>
          </div>

          <button type="button" class="btn btn-gold product-add-btn" id="prod-add-btn" ${ordersOpen ? '' : 'disabled'}>
            ${ordersOpen ? `<span>${esc(tr('Add to Order'))}</span> <span dir="ltr">· ${money(unitPrice(item, currentProductPicks) * currentProductQty)}</span>` : esc(tr('Closed'))}
          </button>

          <a href="#cart" class="btn btn-outline product-view-cart-btn" id="prod-view-cart-btn" hidden>
            ${esc(tr('View Cart →'))}
          </a>
        </div>
      </div>
    </div>`;

  function updateProductLiveDisplay() {
    const unit = unitPrice(currentProduct, currentProductPicks);
    const total = unit * currentProductQty;
    const priceEl = productPageCard.querySelector('#prod-live-price');
    if (priceEl) priceEl.textContent = money(total);
    const qtyEl = productPageCard.querySelector('#prod-qty-display');
    if (qtyEl) qtyEl.textContent = String(currentProductQty);
    const btnEl = productPageCard.querySelector('#prod-add-btn');
    if (btnEl && ordersOpen) {
      btnEl.innerHTML = `<span>${esc(tr('Add to Order'))}</span> <span dir="ltr">· ${money(total)}</span>`;
    }
  }

  productPageCard.querySelectorAll('[data-bubble-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const gi = Number(btn.dataset.bubbleGroup);
      const ci = Number(btn.dataset.bubbleChoice);
      currentProductPicks[gi] = ci === -1 ? [] : [ci];
      productPageCard.querySelectorAll(`[data-bubble-group="${gi}"]`).forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      updateProductLiveDisplay();
    });
  });

  productPageCard.querySelectorAll('[data-addon-group]').forEach((chk) => {
    chk.addEventListener('change', () => {
      const gi = Number(chk.dataset.addonGroup);
      currentProductPicks[gi] = [...productPageCard.querySelectorAll(`[data-addon-group="${gi}"]:checked`)]
        .map((c) => Number(c.dataset.addonChoice));
      updateProductLiveDisplay();
    });
  });

  productPageCard.querySelector('#prod-qty-dec')?.addEventListener('click', () => {
    currentProductQty = Math.max(1, currentProductQty - 1);
    updateProductLiveDisplay();
  });
  productPageCard.querySelector('#prod-qty-inc')?.addEventListener('click', () => {
    currentProductQty = Math.min(99, currentProductQty + 1);
    updateProductLiveDisplay();
  });

  productPageCard.querySelector('#prod-add-btn')?.addEventListener('click', (e) => {
    if (!ordersOpen) return;
    if (!picksValid(currentProduct, currentProductPicks)) {
      const missing = currentProduct.options.find((g, gi) => g.required && !currentProductPicks[gi].length);
      alert(missing
        ? (isAr() ? `يرجى اختيار ${tr(missing.name)}.` : `Please select a ${missing.name.toLowerCase()}.`)
        : (isAr() ? 'يرجى مراجعة الخيارات المختارة.' : 'Please check your option selections.'));
      return;
    }

    const note = productPageCard.querySelector('#prod-note-input')?.value?.trim() || '';
    addToCart(currentProduct.id, currentProductPicks, currentProductQty, e.currentTarget, null, note);

    const viewCartBtn = productPageCard.querySelector('#prod-view-cart-btn');
    if (viewCartBtn) {
      const count = cart.reduce((n, l) => n + l.quantity, 0);
      viewCartBtn.textContent = isAr() ? `عرض السلّة (${count}) ←` : `View Cart (${count}) →`;
      viewCartBtn.hidden = false;
    }

    const btn = e.currentTarget;
    btn.textContent = tr('✓ Added to Order!');
    setTimeout(() => {
      if (btn && ordersOpen) updateProductLiveDisplay();
    }, 1500);
  });

  updateBreadcrumbs({ view: 'product', category: item.category, product: item });
  switchStageView('view-product');
  applyLanguage();
}

// ---------- Screen 4: Dedicated Cart & Checkout Page ----------

function showCartView() {
  enterStorefrontShell({ isCart: true, showVisit: false });
  renderCart();
  updateBreadcrumbs({ view: 'cart' });
  switchStageView('view-cart');
  applyLanguage();
}

// ---------- Search & Quick Filters (Inline Inside Screen 1) ----------

let activeSearchQuery = '';
let activeQuickFilter = 'all';

function setSearchModeUI(searching) {
  if (viewSearch) viewSearch.hidden = !searching;
  if (featuredSliderEl) featuredSliderEl.hidden = searching || sliderSlides.length === 0;
  if (categoriesSection) categoriesSection.hidden = searching;
  if (boxBanner) boxBanner.hidden = true;
  if (menuReelsSection) menuReelsSection.hidden = searching;
  if (searching) {
    stopSliderAutoplay();
    pauseGridReels();
  } else if (!viewMenu?.hidden) {
    startSliderAutoplay();
  }
}

function matchesFilter(item) {
  const enText = `${item.name} ${item.description} ${item.category} ${item.offer_badge || ''}`.toLowerCase();
  const qNorm = normalizeSearchText(activeSearchQuery);
  if (qNorm && !(item._searchIdx || normalizeSearchText(enText)).includes(qNorm)) return false;
  if (activeQuickFilter === 'popular') return Boolean(item.featured) || /lava|mirror|kunafa|gift box|fettuccine|flurry/i.test(enText);
  if (activeQuickFilter === 'pistachio') return /pistachio|kunafa|hazelnut|praline|nut/i.test(enText);
  if (activeQuickFilter === 'dark') return /dark|70%|ganache|mirror|lava|truffle|bark/i.test(enText);
  if (activeQuickFilter === 'under10') return fromPrice(item) <= 1000;
  return true;
}

function renderSearchView() {
  enterStorefrontShell({ isCart: false, showVisit: false });
  switchStageView('view-menu', { scrollTop: false });
  setSearchModeUI(true);

  const ar = isAr();
  const filtered = items.filter(matchesFilter);
  if (searchTitle) {
    searchTitle.textContent = ar
      ? `عرض ${filtered.length} ${filtered.length === 1 ? 'صنف' : 'أصناف'}`
      : `Showing ${filtered.length} creation${filtered.length === 1 ? '' : 's'}`;
  }

  if (searchRowsList) {
    if (!filtered.length) {
      searchRowsList.innerHTML = `
        <div class="card empty-state" style="padding: 36px 20px; text-align: center;">
          <p style="margin-bottom: 14px;">${esc(tr('No creations match your current search or filter.'))}</p>
          <button type="button" class="btn btn-outline btn-sm" id="reset-empty-search">${esc(tr('Show All Categories'))}</button>
        </div>`;
      document.getElementById('reset-empty-search')?.addEventListener('click', resetSearchAndFilters);
    } else {
      searchRowsList.innerHTML = filtered.map(renderRowCard).join('');
      applyCardStagger(searchRowsList, '.menu-row-card');
    }
  }
  updateBreadcrumbs({ view: 'menu' });
}

function resetSearchAndFilters({ navigate = true } = {}) {
  activeSearchQuery = '';
  activeQuickFilter = 'all';
  if (searchInput) searchInput.value = '';
  if (searchClear) searchClear.hidden = true;
  filterPills?.querySelectorAll('[data-qfilter]').forEach((b) => b.classList.toggle('active', b.dataset.qfilter === 'all'));
  setSearchModeUI(false);
  if (navigate) {
    if (window.location.hash !== '#menu') window.location.hash = '#menu';
    else handleHashRouting();
  }
}

searchInput?.addEventListener('input', () => {
  activeSearchQuery = searchInput.value.trim().toLowerCase();
  if (searchClear) searchClear.hidden = !activeSearchQuery;
  if (activeSearchQuery || activeQuickFilter !== 'all') {
    renderSearchView();
  } else {
    handleHashRouting();
  }
});

searchClear?.addEventListener('click', () => {
  if (!searchInput) return;
  searchInput.value = '';
  activeSearchQuery = '';
  searchClear.hidden = true;
  if (activeQuickFilter !== 'all') {
    renderSearchView();
  } else {
    handleHashRouting();
  }
});

clearSearchBtn?.addEventListener('click', () => resetSearchAndFilters({ navigate: true }));

filterPills?.addEventListener('click', (e) => {
  const pill = e.target.closest('[data-qfilter]');
  if (!pill) return;
  activeQuickFilter = pill.dataset.qfilter;
  filterPills.querySelectorAll('[data-qfilter]').forEach((b) => b.classList.toggle('active', b === pill));
  if (activeQuickFilter !== 'all' || activeSearchQuery) {
    renderSearchView();
  } else {
    handleHashRouting();
  }
});

// ---------- Hash Router Controller ----------

function clearSearchSilent() {
  activeSearchQuery = '';
  activeQuickFilter = 'all';
  if (searchInput) searchInput.value = '';
  if (searchClear) searchClear.hidden = true;
  filterPills?.querySelectorAll('[data-qfilter]').forEach((b) => b.classList.toggle('active', b.dataset.qfilter === 'all'));
  setSearchModeUI(false);
}

function handleHashRouting() {
  const hash = window.location.hash.trim();

  if (!hash || hash === '#welcome') {
    clearSearchSilent();
    if (cartConfirmation && !cartConfirmation.hidden) cartConfirmation.hidden = true;
    enterOnboardingScreen();
    return;
  }

  if (hash.startsWith('#reorder=')) {
    const code = decodeURIComponent(hash.slice('#reorder='.length));
    reorderFromHistory(code);
    history.replaceState(null, '', '#cart');
    clearSearchSilent();
    showCartView();
    return;
  }

  if (hash === '#cart') {
    clearSearchSilent();
    showCartView();
    return;
  }

  if (hash.startsWith('#product/')) {
    const id = Number(hash.slice('#product/'.length));
    showProductView(id);
    return;
  }

  if (hash.startsWith('#category/')) {
    clearSearchSilent();
    const catName = decodeURIComponent(hash.slice('#category/'.length));
    showCategoryView(catName);
    return;
  }

  if (activeSearchQuery || activeQuickFilter !== 'all') {
    renderSearchView();
    return;
  }

  if (cartConfirmation && !cartConfirmation.hidden) {
    cartConfirmation.hidden = true;
    renderCart();
  }

  if (hash === '#gift-box') {
    showMenuHomeView({ navKey: 'gift-box' });
    openBoxBuilderModal();
    return;
  }

  if (hash === '#visit' || hash === '#visit-section') {
    showMenuHomeView({ scrollTarget: visitSection, navKey: 'visit' });
    return;
  }

  if (hash === '#categories-section') {
    showMenuHomeView({ scrollTarget: categoriesSection });
    return;
  }

  if (hash === '#box-banner') {
    showMenuHomeView({ scrollTarget: boxBanner });
    return;
  }

  // Default inside view: Screen 1 (#menu / #folders / #omvi)
  showMenuHomeView();
}

window.addEventListener('hashchange', handleHashRouting);

// Back buttons navigation
catBackBtn?.addEventListener('click', () => { window.location.hash = '#menu'; });
prodBackBtn?.addEventListener('click', () => {
  if (currentCategory) {
    window.location.hash = `#category/${encodeURIComponent(currentCategory)}`;
  } else {
    window.location.hash = '#menu';
  }
});

// Delegated SVG icon fallback when a product or category image fails to load
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  const prodVisual = img.closest('.row-card-visual');
  const prodCard = prodVisual?.closest('[data-open-product]');
  if (prodVisual && prodCard) {
    const item = itemsById.get(Number(prodCard.dataset.openProduct));
    if (item) {
      prodVisual.innerHTML = `<div class="row-card-icon">${illustrationFor(item)}</div>`;
    }
    return;
  }
  const catVisual = img.closest('.folder-visual');
  const catCard = catVisual?.closest('[data-nav-cat]');
  if (catVisual && catCard) {
    const meta = CATEGORY_META[catCard.dataset.navCat] || { icon: DEFAULT_CATEGORY_ICON };
    catVisual.innerHTML = `<div class="folder-icon">${meta.icon}</div>`;
  }
}, true);

// Delegated interactions across all screens
document.addEventListener('click', (e) => {
  const samePageHash = e.target.closest('a[href^="#"], a[href^="/#"]');
  if (samePageHash && (location.pathname === '/' || location.pathname === '/index.html')) {
    const rawHref = samePageHash.getAttribute('href') || '';
    const targetHash = rawHref.startsWith('/#') ? rawHref.slice(1) : rawHref;
    if (targetHash && window.location.hash === targetHash) {
      e.preventDefault();
      handleHashRouting();
      return;
    }
  }

  const rowBtn = e.target.closest('[data-open-product]');
  if (rowBtn) {
    e.preventDefault();
    const id = Number(rowBtn.dataset.openProduct);
    window.location.hash = `#product/${id}`;
    return;
  }

  const offerBoxBtn = e.target.closest('[data-open-offer-box]');
  if (offerBoxBtn) {
    e.preventDefault();
    const size = Number(offerBoxBtn.dataset.openOfferBox);
    openBoxBuilderModal([9, 16, 25].includes(size) ? size : null);
    return;
  }

  const sliderHrefBtn = e.target.closest('[data-slider-href]');
  if (sliderHrefBtn) {
    e.preventDefault();
    window.location.hash = sliderHrefBtn.dataset.sliderHref;
    return;
  }

  const quickAdd = e.target.closest('[data-add-quick]');
  if (quickAdd && ordersOpen) {
    const id = Number(quickAdd.dataset.addQuick);
    addToCart(id, [], 1, quickAdd);
    return;
  }

  const removeBtn = e.target.closest('[data-remove-line]');
  if (removeBtn) {
    removeLine(removeBtn.dataset.removeLine);
    return;
  }

  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  if (inc) changeLine(inc.dataset.inc, 1);
  if (dec) changeLine(dec.dataset.dec, -1);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.menu-row-card[data-open-product]');
  if (!card || e.target.closest('button, a, input, label')) return;
  e.preventDefault();
  const id = Number(card.dataset.openProduct);
  window.location.hash = `#product/${id}`;
});

// ---------- Interactive Gift Box Builder Modal ----------

const boxDialog = document.getElementById('box-dialog');
const boxTray = document.getElementById('box-tray');
const boxFlavors = document.getElementById('box-flavors');
const boxProgress = document.getElementById('box-progress');
const boxPriceLabel = document.getElementById('box-price-label');
const boxError = document.getElementById('box-error');
let activeBoxSize = 9;
let boxSlots = [];

function renderBoxFlavors() {
  if (!boxFlavors) return;
  boxFlavors.innerHTML = TRUFFLES.map((t) => `
    <button type="button" class="truffle-pick" data-truffle="${esc(t.id)}">
      <span class="truffle-dot" style="background:${esc(t.color)};box-shadow:inset 0 0 0 2px ${esc(t.accent)}"></span>
      <span class="truffle-name">${esc(tr(t.name))}</span>
      <span class="truffle-add">+</span>
    </button>
  `).join('');
}

function renderBoxTray() {
  if (!boxTray) return;
  const tier = BOX_TIERS[activeBoxSize];
  const ar = isAr();
  boxTray.dataset.cols = String(tier.cols);
  boxTray.innerHTML = Array.from({ length: activeBoxSize }, (_, i) => {
    const t = boxSlots[i];
    if (!t) {
      return `<button type="button" class="box-slot empty" data-slot="${i}" aria-label="Empty slot ${i + 1}"><span>+</span></button>`;
    }
    const tName = tr(t.name);
    return `
      <button type="button" class="box-slot filled" data-slot="${i}" title="${esc(tName)}" aria-label="${esc(tName)}">
        <span class="bonbon" style="background:${esc(t.color)};border-color:${esc(t.accent)}"></span>
      </button>`;
  }).join('');
  if (boxProgress) {
    boxProgress.textContent = ar
      ? `تم اختيار ${boxSlots.length} / ${activeBoxSize} قطعة`
      : `${boxSlots.length} / ${activeBoxSize} pieces selected`;
  }
  if (boxPriceLabel) boxPriceLabel.textContent = money(tier.price_cents);
}

function setBoxSize(size) {
  if (!BOX_TIERS[size]) return;
  activeBoxSize = size;
  boxDialog?.querySelectorAll('[data-box-size]').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.boxSize) === activeBoxSize);
  });
  if (boxSlots.length > activeBoxSize) boxSlots = boxSlots.slice(0, activeBoxSize);
  renderBoxTray();
}

function openBoxBuilderModal(requestedSize = null) {
  if (!boxDialog) return;
  if (requestedSize && BOX_TIERS[requestedSize]) setBoxSize(requestedSize);
  if (boxError) boxError.hidden = true;
  if (boxSlots.length === 0) {
    boxSlots = Array.from({ length: activeBoxSize }, (_, i) => TRUFFLES[i % TRUFFLES.length]);
  }
  renderBoxTray();
  if (!boxDialog.open) boxDialog.showModal();
}

renderBoxFlavors();
renderBoxTray();

document.getElementById('open-box-builder')?.addEventListener('click', () => openBoxBuilderModal());

boxDialog?.querySelectorAll('[data-box-size]').forEach((btn) => {
  btn.addEventListener('click', () => setBoxSize(Number(btn.dataset.boxSize)));
});

boxFlavors?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-truffle]');
  if (!btn) return;
  const truffle = TRUFFLES.find((t) => t.id === btn.dataset.truffle);
  if (!truffle) return;
  if (boxSlots.length < activeBoxSize) {
    boxSlots.push(truffle);
  } else {
    boxSlots[activeBoxSize - 1] = truffle;
  }
  if (boxError) boxError.hidden = true;
  renderBoxTray();
});

boxTray?.addEventListener('click', (e) => {
  const slot = e.target.closest('[data-slot]');
  if (!slot) return;
  const idx = Number(slot.dataset.slot);
  if (idx >= 0 && idx < boxSlots.length) {
    boxSlots.splice(idx, 1);
    renderBoxTray();
  }
});

document.getElementById('box-autofill')?.addEventListener('click', () => {
  while (boxSlots.length < activeBoxSize) {
    boxSlots.push(TRUFFLES[boxSlots.length % TRUFFLES.length]);
  }
  if (boxError) boxError.hidden = true;
  renderBoxTray();
});

document.getElementById('box-clear')?.addEventListener('click', () => {
  boxSlots = [];
  renderBoxTray();
});

boxDialog?.querySelector('[data-box-close]')?.addEventListener('click', () => boxDialog.close());
boxDialog?.addEventListener('click', (e) => { if (e.target === boxDialog) boxDialog.close(); });
boxDialog?.addEventListener('close', () => {
  if (window.location.hash === '#gift-box') {
    history.replaceState(null, '', '#menu');
  }
});

document.getElementById('box-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  while (boxSlots.length < activeBoxSize) {
    boxSlots.push(TRUFFLES[boxSlots.length % TRUFFLES.length]);
  }
  const customBox = {
    size: activeBoxSize,
    pieces: boxSlots.map((t) => t.name),
    ribbon: document.getElementById('box-ribbon').value,
    note: document.getElementById('box-note').value.trim(),
  };
  boxDialog.close();
  addToCart(0, [], 1, document.getElementById('open-box-builder') || headerCartBtn, customBox);
});

// ---------- Checkout Form & Confirmation ----------

fulfillment = setupFulfillment(form, settings, renderCart);
const branchOf = await setupBranches(form);
restoreCustomerPrefs(form);
promo = setupPromoField(form, { getSubtotal: cartSubtotalCents, onChange: renderCart });

dataLoaded = true;
renderCart();
const renderMenuReels = () => mountReelsStrip(menuReelsGrid, {
  menuItems: items,
  onOpenProduct: (id) => {
    window.location.hash = `#product/${id}`;
  },
});
renderMenuReels();
if (userLeftOnboardingEarly && (!window.location.hash || window.location.hash === '#welcome')) {
  window.location.hash = '#menu';
}
handleHashRouting();

window.addEventListener('savory:langchange', () => {
  if (sliderTrack && sliderSlides.length) {
    sliderTrack.innerHTML = sliderSlides.map(buildSliderCard).join('');
    setSliderIndex(sliderIdx);
  }
  renderMenuReels();
  renderBoxFlavors();
  renderBoxTray();
  renderCart();
  const h = window.location.hash.trim();
  if (h && h !== '#welcome') {
    if ((activeSearchQuery || activeQuickFilter !== 'all') && (!h || h === '#menu')) {
      renderSearchView();
    } else if (h.startsWith('#category/') && currentCategory) {
      showCategoryView(currentCategory);
    } else if (h.startsWith('#product/') && currentProduct) {
      showProductView(currentProduct.id);
    } else if (h === '#menu') {
      showMenuHomeView({ scrollTop: false });
    }
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  data.fulfillment = fulfillment();
  data.branch = branchOf()?.id;
  data.promo_code = promo?.getCode() || '';
  data.items = cart.map((l) => (
    l.custom_box
      ? { quantity: l.quantity, custom_box: l.custom_box }
      : l.note
        ? { id: l.id, quantity: l.quantity, choices: l.picks, note: l.note }
        : { id: l.id, quantity: l.quantity, choices: l.picks }
  ));

  const submittedItems = JSON.parse(JSON.stringify(data.items));
  saveCustomerPrefs(data);

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${isAr() ? 'جاري إرسال طلبك…' : 'Placing your order…'}`;
  try {
    const order = await api('/api/orders/menu', { method: 'POST', body: data });
    cart = [];
    saveCart();
    promo?.clear();
    showConfirmation(order, data.customer_name, submittedItems);
    openWhatsApp(order.whatsapp_url);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.hidden = false;
  } finally {
    submitBtn.disabled = !ordersOpen;
    submitBtn.textContent = tr('Place order');
  }
});

function showConfirmation(order, name, submittedItems = []) {
  confetti();
  playCelebration();
  if (cartConfirmation) {
    const ar = isAr();
    cartConfirmation.innerHTML = orderConfirmation(order, {
      name,
      title: 'your order is in!',
      shopName: settings.shop_name,
      recentMeta: { type: 'menu', items: submittedItems, total_cents: order.total_cents },
      links: ar
        ? `<a class="btn btn-gold" href="/track?site=menu&code=${encodeURIComponent(order.order_code || order.code)}">تتبّع الطلب مباشرة</a><a class="btn btn-outline" href="#menu">اطلب المزيد من القائمة</a>`
        : `<a class="btn btn-gold" href="/track?site=menu&code=${encodeURIComponent(order.order_code || order.code)}">Track order live</a><a class="btn btn-outline" href="#menu">Order more from menu</a>`,
    });
    cartConfirmation.hidden = false;
  }
  renderCart();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
