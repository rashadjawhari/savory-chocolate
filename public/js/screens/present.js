// Interactive Client Presentation & Device Playground Controller (/present)

const menuBase = resolveOrigin(document.body.dataset.menuUrl || '', 'menu');
const cakesBase = resolveOrigin(document.body.dataset.cakesUrl || '', 'cakes');
const adminBase = document.body.dataset.adminUrl || 'https://savory-962f3-admin.web.app';

function resolveOrigin(configured, role) {
  const host = window.location.hostname.toLowerCase();
  if (role === 'menu' && (host.includes('menu') || window.location.port === '3001')) {
    return window.location.origin;
  }
  if (role === 'cakes' && (host.includes('cakes') || window.location.port === '3000')) {
    return window.location.origin;
  }
  return configured || window.location.origin;
}

const slides = [...document.querySelectorAll('.p-slide')];
const totalSlides = slides.length;
const dotsWrap = document.getElementById('p-slide-dots');
const counterEl = document.getElementById('p-counter');
const prevBtn = document.getElementById('p-prev');
const nextBtn = document.getElementById('p-next');
const openMenuLink = document.getElementById('p-open-menu');
const gridOverlay = document.getElementById('p-grid-overlay');
const gridCardsWrap = document.getElementById('p-grid-cards');
const gridCloseBtn = document.getElementById('p-grid-close');
const notesBtn = document.getElementById('p-notes-btn');
const notesDrawer = document.getElementById('p-notes-drawer');
const notesCloseBtn = document.getElementById('p-notes-close');
const notesTitleEl = document.getElementById('p-notes-slide-label');
const notesTextEl = document.getElementById('p-notes-text');
const fullscreenBtn = document.getElementById('p-fullscreen-btn');
const modeTabs = [...document.querySelectorAll('.p-tab')];

const SPEAKER_NOTES = [
  'Open on SAVORY’s Warm Ivory (#F9F6EE), Deep Cocoa (#4C2007), and clean Cabin typography. Point out the 3 live production properties ready today.',
  'Demonstrate the looped video onboarding directly inside the live Phone/Laptop frame: swipe horizontally, tap ← / →, switch عربي / EN, and click ORDER NOW →.',
  'Highlight the magazine-style Featured split header, ← 01 02 03 → top index, search & filter pills, and horizontal Instagram Reels strip below.',
  'Show the redesigned Product Page cleanup: no white box cards, no floating stickers over photography, locked mobile zoom, solid header, and clean hairline options.',
  'Walk through the sister WebGL 3D Custom Cake Studio where guests customize tiers, fillings, frosting, slice view, candles, and share directly on WhatsApp.',
  'Cover operations: single Admin Hub for menu modifiers, onboarding reels, slider offers, live kitchen tickets, and cache-busted 3-site Firebase hosting.',
  'Free-roam live playground: switch Phone vs Laptop frames and jump straight into Gift Boxes, Categories, Cart, or 3D Cake Studio for client Q&A.',
];

if (openMenuLink) openMenuLink.href = menuBase;

// Mount one shared interactive Device Shell so iframe navigation feels fast and unified
const tpl = document.getElementById('p-device-tpl');
const shell = tpl.content.firstElementChild.cloneNode(true);
const bezel = shell.querySelector('#p-bezel');
const iframeWrap = shell.querySelector('.p-iframe-wrap');
const iframe = shell.querySelector('.p-device-iframe');
const reloadBtn = shell.querySelector('[data-dev-reload]');
const externalBtn = shell.querySelector('[data-dev-external]');
const urlLabel = shell.querySelector('[data-url-label]');
const devBtns = [...shell.querySelectorAll('[data-set-device]')];

let currentSlide = 0;
let deviceMode = window.innerWidth <= 900 ? 'phone' : 'phone';
let currentSiteRole = 'menu';
let currentEmbedPath = '/#welcome';

function buildTargetUrl(siteRole, relPath) {
  const base = siteRole === 'cakes' ? cakesBase : siteRole === 'admin' ? adminBase : menuBase;
  return `${base.replace(/\/$/, '')}${relPath.startsWith('/') ? relPath : `/${relPath}`}`;
}

function scaleIframeToBezel() {
  if (!iframeWrap || !iframe) return;
  if (deviceMode === 'laptop') {
    const targetW = 1280;
    const availW = iframeWrap.clientWidth || 720;
    const availH = iframeWrap.clientHeight || 450;
    const scale = availW / targetW;
    iframe.style.width = `${targetW}px`;
    iframe.style.height = `${Math.round(availH / scale)}px`;
    iframe.style.transform = `scale(${scale})`;
  } else {
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.transform = 'none';
  }
}

if ('ResizeObserver' in window && iframeWrap) {
  new ResizeObserver(scaleIframeToBezel).observe(iframeWrap);
}
window.addEventListener('resize', scaleIframeToBezel);

function setDeviceMode(mode) {
  deviceMode = mode === 'laptop' ? 'laptop' : 'phone';
  shell.dataset.shellMode = deviceMode;
  bezel.classList.toggle('p-bezel-phone', deviceMode === 'phone');
  bezel.classList.toggle('p-bezel-laptop', deviceMode === 'laptop');
  devBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.setDevice === deviceMode));
  requestAnimationFrame(scaleIframeToBezel);
}

devBtns.forEach((btn) => btn.addEventListener('click', () => setDeviceMode(btn.dataset.setDevice)));

function loadEmbed(siteRole, relPath) {
  currentSiteRole = siteRole || 'menu';
  currentEmbedPath = relPath || '/#welcome';
  const fullUrl = buildTargetUrl(currentSiteRole, currentEmbedPath);
  if (externalBtn) externalBtn.href = fullUrl;
  if (urlLabel) urlLabel.textContent = fullUrl.replace(/^https?:\/\//, '');
  if (iframe && iframe.getAttribute('src') !== fullUrl) {
    iframe.setAttribute('src', fullUrl);
  }
  requestAnimationFrame(scaleIframeToBezel);
}

reloadBtn?.addEventListener('click', () => {
  const fullUrl = buildTargetUrl(currentSiteRole, currentEmbedPath);
  iframe.setAttribute('src', fullUrl);
});

// Sandbox jump pills (Slide 07)
const jumpBtns = [...document.querySelectorAll('[data-jump-path]')];
jumpBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    jumpBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
    loadEmbed(btn.dataset.jumpSite || 'menu', btn.dataset.jumpPath || '/#welcome');
  });
});

// Build bottom slide index dots and Grid overview cards
if (dotsWrap) {
  dotsWrap.innerHTML = slides.map((s, i) => `
    <button type="button" class="p-dot-btn${i === 0 ? ' is-active' : ''}" data-goto-slide="${i}">
      ${String(i + 1).padStart(2, '0')}
    </button>
  `).join('');
}

if (gridCardsWrap) {
  gridCardsWrap.innerHTML = slides.map((s, i) => `
    <button type="button" class="p-grid-card${i === 0 ? ' is-current' : ''}" data-goto-slide="${i}">
      <small>SLIDE ${String(i + 1).padStart(2, '0')}</small>
      <strong>${s.dataset.title || `Slide ${i + 1}`}</strong>
      <span style="font-size:0.84rem;opacity:0.78;">${SPEAKER_NOTES[i] || ''}</span>
    </button>
  `).join('');
}

function updateModeTabs(activeMode) {
  modeTabs.forEach((tab) => {
    const isMatch = tab.dataset.mode === activeMode;
    tab.classList.toggle('is-active', isMatch);
    tab.setAttribute('aria-selected', String(isMatch));
  });
}

function goToSlide(idx, { closeGrid = true } = {}) {
  const clamped = ((idx % totalSlides) + totalSlides) % totalSlides;
  currentSlide = clamped;

  slides.forEach((s, i) => {
    s.classList.toggle('is-active', i === currentSlide);
    s.classList.toggle('is-prev', i < currentSlide);
  });

  dotsWrap?.querySelectorAll('.p-dot-btn').forEach((d, i) => d.classList.toggle('is-active', i === currentSlide));
  gridCardsWrap?.querySelectorAll('.p-grid-card').forEach((c, i) => c.classList.toggle('is-current', i === currentSlide));

  if (counterEl) {
    counterEl.textContent = `${String(currentSlide + 1).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
  }
  if (notesTitleEl) {
    notesTitleEl.textContent = `Slide ${String(currentSlide + 1).padStart(2, '0')} · ${slides[currentSlide]?.dataset.title || ''}`;
  }
  if (notesTextEl) {
    notesTextEl.textContent = SPEAKER_NOTES[currentSlide] || '';
  }

  // Mount interactive live device frame into active slide if it has a slot
  const activeSlideEl = slides[currentSlide];
  const slot = activeSlideEl?.querySelector('[data-device-slot]');
  if (slot) {
    slot.appendChild(shell);
    const defaultSite = activeSlideEl.dataset.embedSite || 'menu';
    const defaultPath = activeSlideEl.dataset.embedPath || '/#welcome';
    if (currentSlide === 6) {
      setDeviceMode(deviceMode);
      const activeJump = document.querySelector('.p-jump.is-active');
      loadEmbed(activeJump?.dataset.jumpSite || defaultSite, activeJump?.dataset.jumpPath || defaultPath);
    } else {
      loadEmbed(defaultSite, defaultPath);
    }
  }

  if (closeGrid && gridOverlay) gridOverlay.hidden = true;
  updateModeTabs(currentSlide === 6 ? 'sandbox' : 'slides');
}

document.addEventListener('click', (e) => {
  const gotoBtn = e.target.closest('[data-goto-slide]');
  if (gotoBtn) {
    goToSlide(Number(gotoBtn.dataset.gotoSlide));
  }
});

prevBtn?.addEventListener('click', () => goToSlide(currentSlide - 1));
nextBtn?.addEventListener('click', () => goToSlide(currentSlide + 1));

modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    if (mode === 'grid') {
      gridOverlay.hidden = false;
      updateModeTabs('grid');
    } else if (mode === 'sandbox') {
      goToSlide(6);
    } else {
      if (gridOverlay) gridOverlay.hidden = true;
      if (currentSlide === 6) goToSlide(0);
      else updateModeTabs('slides');
    }
  });
});

gridCloseBtn?.addEventListener('click', () => {
  if (gridOverlay) gridOverlay.hidden = true;
  updateModeTabs(currentSlide === 6 ? 'sandbox' : 'slides');
});

notesBtn?.addEventListener('click', () => {
  const nextHidden = !notesDrawer.hidden;
  notesDrawer.hidden = nextHidden;
  notesBtn.setAttribute('aria-pressed', String(!nextHidden));
});
notesCloseBtn?.addEventListener('click', () => {
  notesDrawer.hidden = true;
  notesBtn?.setAttribute('aria-pressed', 'false');
});

fullscreenBtn?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') goToSlide(currentSlide + 1);
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') goToSlide(currentSlide - 1);
  else if (e.key.toLowerCase() === 'g') {
    gridOverlay.hidden = !gridOverlay.hidden;
    updateModeTabs(gridOverlay.hidden ? (currentSlide === 6 ? 'sandbox' : 'slides') : 'grid');
  } else if (e.key.toLowerCase() === 'n') {
    notesBtn?.click();
  } else if (e.key.toLowerCase() === 'f') {
    fullscreenBtn?.click();
  } else if (e.key === 'Escape' && !gridOverlay.hidden) {
    gridOverlay.hidden = true;
    updateModeTabs(currentSlide === 6 ? 'sandbox' : 'slides');
  }
});

// Initialize Slide 01
goToSlide(0);
