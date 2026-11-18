import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const FIGCRAFT_CLI = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe';
const OUT_FIGCRAFT_PROJECT = path.join(ROOT, 'SAVORY-Client-Presentation.figcraft');
const OUT_FIGCRAFT_DOCS = 'C:\\Users\\User\\Documents\\SAVORY-Client-Presentation.figcraft';
const OUT_PDF_PROJECT = path.join(ROOT, 'SAVORY-Client-Presentation.pdf');
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\3343369f-f866-4d0e-a4ae-2f47a761bc46';
const OUT_PNG_PHONE = path.join(ARTIFACT_DIR, 'savory-figcraft-phone-flow.png');
const OUT_PNG_LAPTOP = path.join(ARTIFACT_DIR, 'savory-figcraft-laptop-flow.png');
const TMP_SCRIPT = path.join(ARTIFACT_DIR, '.tmp-figcraft-commands.json');

const IMG = (rel) => path.join(ROOT, 'public', 'img', 'social', rel).replace(/\\/g, '/');

// Extract authentic SAVORY SVG vector paths (Cocoa Pod emblem + SAVORY wordmark)
const logoHtml = fs.readFileSync(path.join(ROOT, 'views', 'partials', 'brand-logo.html'), 'utf8');
const [POD_PATH, WORD_PATH] = [...logoHtml.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);

// SAVORY Design Tokens
const CREAM = '#F9F6EE';
const CREAM_SOFT = '#F2EDE1';
const CREAM_CARD = '#EAE4D4';
const CREAM_ALT = '#FDFBF7';
const COCOA = '#4C2007';
const COCOA_SOFT = '#6E3310';
const MUTED = '#845537';
const ESPRESSO = '#220B03';
const ESPRESSO_CARD = '#311206';
const GOLD = '#D9B066';
const BORDER_LINE = '#E5DEC9';
const WHATSAPP_GREEN = '#25D366';

const commands = [];
let nextId = 2; // Page 1 starts as node id 1

function cmd(command, params) {
  commands.push({ command, params });
}

function addPage(name) {
  const id = nextId++;
  cmd('page.add', { name });
  return id;
}

function createNode(params) {
  const id = nextId++;
  cmd('node.create', params);
  return id;
}

function frame({
  name,
  parent = null,
  x = 0,
  y = 0,
  width = 100,
  height = 100,
  fill = CREAM,
  radius = 0,
  clip = true,
  stroke = null,
  strokeWeight = 1,
  overflow = null,
  scrollPosition = null,
  opacity = 1,
}) {
  const props = { fill, clip, opacity };
  if (radius) props.cornerRadius = radius;
  if (overflow) props.overflow = overflow;
  if (scrollPosition) props.scrollPosition = scrollPosition;
  if (stroke) {
    props.stroke = stroke;
    props.strokeWeight = strokeWeight;
  }
  const params = { type: 'frame', name, x, y, width, height, props };
  if (parent !== null) params.parent = parent;
  return createNode(params);
}

function rect({
  name = 'Rect',
  parent,
  x = 0,
  y = 0,
  width = 100,
  height = 100,
  fill = CREAM_SOFT,
  radius = 0,
  stroke = null,
  strokeWeight = 1,
  opacity = 1,
}) {
  const props = { fill, opacity };
  if (radius) props.cornerRadius = radius;
  if (stroke) {
    props.stroke = stroke;
    props.strokeWeight = strokeWeight;
  }
  return createNode({ type: 'rectangle', name, parent, x, y, width, height, props });
}

function circle({ name = 'Circle', parent, x = 0, y = 0, size = 40, fill = CREAM, opacity = 1, stroke = null, strokeWeight = 1 }) {
  const props = { fill, opacity };
  if (stroke) {
    props.stroke = stroke;
    props.strokeWeight = strokeWeight;
  }
  return createNode({ type: 'ellipse', name, parent, x, y, width: size, height: size, props });
}

function shadow(ids, { color = '#4C200728', offset = [0, 8], radius = 20, spread = -4 } = {}) {
  cmd('effect.add', {
    ids: Array.isArray(ids) ? ids : [ids],
    effect: { type: 'dropShadow', color, offset, radius, spread },
  });
}

function gradientRect({ name = 'Grad', parent, x = 0, y = 0, width = 100, height = 100, stops = ['#14070200', '#140702CC'], from = [0.5, 0], to = [0.5, 1], radius = 0 }) {
  const props = {
    fills: [{ type: 'linearGradient', stops, from, to }],
  };
  if (radius) props.cornerRadius = radius;
  return createNode({ type: 'rectangle', name, parent, x, y, width, height, props });
}

function brandVector({ name = 'Logo', parent, x, y, height, pathData, color = COCOA }) {
  const id = nextId++;
  cmd('vector.create', {
    path: pathData,
    x,
    y,
    height,
    parent,
    name,
    props: { fill: color },
  });
  cmd('vector.fillRule', { id, rule: 'evenOdd' });
  return id;
}

function addInlineLogo(parent, { x = 16, y = 16, markHeight = 28, wordHeight = 16, color = COCOA, stacked = false } = {}) {
  if (stacked) {
    // Center aligned vertically within given box around (x, y)
    const podW = Math.round(markHeight * (182 / 280));
    const wordW = Math.round(wordHeight * (666 / 129));
    brandVector({
      name: 'Brand Cocoa Mark',
      parent,
      x: Math.round(x - podW / 2),
      y,
      height: markHeight,
      pathData: POD_PATH,
      color,
    });
    brandVector({
      name: 'Brand Wordmark',
      parent,
      x: Math.round(x - wordW / 2),
      y: y + markHeight + 12,
      height: wordHeight,
      pathData: WORD_PATH,
      color,
    });
    return;
  }
  const podW = Math.round(markHeight * (182 / 280));
  brandVector({
    name: 'Brand Cocoa Mark',
    parent,
    x,
    y,
    height: markHeight,
    pathData: POD_PATH,
    color,
  });
  brandVector({
    name: 'Brand Wordmark',
    parent,
    x: x + podW + 10,
    y: y + Math.round((markHeight - wordHeight) / 2),
    height: wordHeight,
    pathData: WORD_PATH,
    color,
  });
}

function text({
  name = 'Text',
  parent,
  x = 0,
  y = 0,
  width = null,
  height = null,
  value = '',
  fontFamily = 'Cabin',
  fontStyle = 'Regular',
  fontSize = 18,
  fill = COCOA,
  lineHeight = null,
  letterSpacing = null,
  textAlign = 'left',
  opacity = 1,
}) {
  const props = { fontFamily, fontStyle, fontSize, fill, textAlign, opacity };
  if (lineHeight) props.lineHeight = lineHeight;
  if (letterSpacing) props.letterSpacing = letterSpacing;
  const params = { type: 'text', name, parent, x, y, text: value, props };
  if (width !== null) params.width = width;
  if (height !== null) params.height = height;
  return createNode(params);
}

function bindVar(nodeId, varName) {
  cmd('variable.bind', { ids: [nodeId], field: 'characters', variable: varName });
}

function imageBox({ name = 'Photo', parent, x, y, width, height, file, radius = 10, withShadow = false }) {
  const rId = rect({ name, parent, x, y, width, height, fill: '#3A1807', radius });
  cmd('image.place', { path: file, target: rId, mode: 'fill' });
  if (withShadow) shadow(rId, { color: '#4C200722', offset: [0, 10], radius: 22, spread: -6 });
  return rId;
}

function clickNav(hotspotId, destId, { type = 'push', direction = 'left', durationMs = 440, preserveScroll = false } = {}) {
  if (!hotspotId || !destId) {
    throw new Error(`Invalid clickNav target: hotspot=${hotspotId}, dest=${destId}`);
  }
  const action = preserveScroll
    ? { type: 'navigate', dest: destId, preserveScroll: true }
    : { type: 'navigate', dest: destId };
  const transition = type === 'smartAnimate'
    ? { type: 'smartAnimate' }
    : { type, direction };
  cmd('proto.interaction.add', {
    id: hotspotId,
    trigger: { type: 'onClick' },
    action,
    transition,
    durationMs,
    easing: 'gentle',
  });
}

function overlayNav(hotspotId, destId, { position = 'topRight', direction = 'left', closeOutside = true } = {}) {
  cmd('proto.interaction.add', {
    id: hotspotId,
    trigger: { type: 'onClick' },
    action: {
      type: 'openOverlay',
      dest: destId,
      position,
      close_on_outside: closeOutside,
      background: '#14070299',
    },
    transition: { type: 'moveIn', direction },
    durationMs: 360,
    easing: 'gentle',
  });
}

function closeOverlayNav(hotspotId) {
  cmd('proto.interaction.add', {
    id: hotspotId,
    trigger: { type: 'onClick' },
    action: { type: 'closeOverlay' },
  });
}

function dragNav(nodeId, destId, { durationMs = 460, preserveScroll = false } = {}) {
  const action = preserveScroll
    ? { type: 'navigate', dest: destId, preserveScroll: true }
    : { type: 'navigate', dest: destId };
  cmd('proto.interaction.add', {
    id: nodeId,
    trigger: { type: 'onDrag' },
    action,
    transition: { type: 'smartAnimate' },
    durationMs,
    easing: 'gentle',
  });
}

function keyNav(nodeId, key, destId, { type = 'smartAnimate', direction = 'left', durationMs = 440 } = {}) {
  cmd('proto.interaction.add', {
    id: nodeId,
    trigger: { type: 'keyPress', key },
    action: { type: 'navigate', dest: destId },
    transition: type === 'smartAnimate' ? { type: 'smartAnimate' } : { type, direction },
    durationMs,
    easing: 'gentle',
  });
}

function bindLangToggle(btnId) {
  cmd('proto.interaction.add', {
    id: btnId,
    trigger: { type: 'onClick' },
    action: {
      type: 'conditional',
      blocks: [
        {
          expression: "mode(SAVORY_I18N) == 'EN'",
          actions: [{ type: 'setVariableMode', collection: 'SAVORY_I18N', mode: 'AR' }],
        },
        {
          actions: [{ type: 'setVariableMode', collection: 'SAVORY_I18N', mode: 'EN' }],
        },
      ],
    },
  });
}

// ============================================================================
// GLOBAL VARIABLES: LIVE BILINGUAL (EN / AR) + QUANTITY COUNTER
// ============================================================================
cmd('variable.createCollection', { name: 'SAVORY_I18N', modes: ['EN', 'AR'] });
const i18nEntries = [
  ['i18n_featured', 'Featured', 'العروض والمميزة'],
  ['i18n_featured_sub', 'Discover our signature handcrafted chocolates, warm crepes, and seasonal specials.', 'اكتشف تشكيلة الشوكولا البلجيكية والكريب المحضّرة يدوياً يومياً.'],
  ['i18n_search', '⌕   Search menu…', '⌕   ابحث في القائمة…'],
  ['i18n_categories', 'Categories', 'التصنيفات'],
  ['i18n_reels', '@savory.chocolate Reels', 'فيديوهات @savory.chocolate'],
  ['i18n_order_now', 'ORDER NOW  →', '←  اطلب الآن'],
  ['i18n_lang_btn', 'عربي', 'EN'],
  ['i18n_add_order', 'Add to Order', 'أضف إلى الطلب'],
  ['i18n_cart', 'Your Cart', 'سلّة التسوّق'],
];
for (const [vName, enVal, arVal] of i18nEntries) {
  cmd('variable.create', {
    collection: 'SAVORY_I18N',
    name: vName,
    type: 'string',
    values: { EN: enVal, AR: arVal },
  });
}

cmd('proto.presentOptions', {
  scale: 'fit',
  deviceFrame: true,
  hotspotHints: true,
});

// ============================================================================
// PAGE 1: PHONE INTERACTIVE APP (iPhone 17 Pro — 402 × 874)
// ============================================================================
cmd('file.rename', { name: 'SAVORY Interactive Prototype & Presentation' });
cmd('page.rename', { name: '01 · Phone Interactive App (iPhone 17 Pro)' });
cmd('proto.settings', { device: 'iPhone 17 Pro', background: '#140702', rotation: 'portrait' });

const PW = 402;
const PH = 874;
const pPos = (idx) => ({
  x: (idx % 6) * (PW + 100),
  y: Math.floor(idx / 6) * (PH + 160),
});

function addFixedMobileHeader(screenId, { showFloatingCart = false, cartTotal = '$12.00' } = {}) {
  // Floating Bottom Cart Bar (pinned at bottom during scroll!)
  let bottomCartBtn = null;
  if (showFloatingCart) {
    bottomCartBtn = frame({
      name: 'Mobile Floating Cart Bar',
      parent: screenId,
      x: 16,
      y: 804,
      width: PW - 32,
      height: 52,
      fill: COCOA,
      radius: 999,
      scrollPosition: 'fixed',
    });
    shadow(bottomCartBtn, { color: '#220B0355', offset: [0, 10], radius: 22, spread: -2 });
    text({ name: 'Float Cart Left', parent: bottomCartBtn, x: 22, y: 17, value: 'View cart · 1 item', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: CREAM });
    text({ name: 'Float Cart Right', parent: bottomCartBtn, x: PW - 140, y: 17, width: 86, value: cartTotal, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'right', fill: GOLD });
  }

  // Fixed Top Header (pinned at y = 0 above all scrollable content!)
  const hdr = frame({
    name: 'Fixed Mobile Header',
    parent: screenId,
    x: 0,
    y: 0,
    width: PW,
    height: 64,
    fill: CREAM,
    scrollPosition: 'fixed',
  });
  rect({ name: 'Hdr Bottom Line', parent: hdr, x: 0, y: 63, width: PW, height: 1, fill: BORDER_LINE });

  const logoBtn = frame({ name: 'Hdr Brand Hitbox', parent: hdr, x: 16, y: 12, width: 144, height: 40, fill: CREAM });
  addInlineLogo(logoBtn, { x: 0, y: 6, markHeight: 28, wordHeight: 16, color: COCOA });

  const langBtn = frame({ name: 'Hdr Lang Hitbox', parent: hdr, x: 214, y: 16, width: 48, height: 32, fill: CREAM, radius: 6 });
  const langTxt = text({ name: 'Hdr Lang Label', parent: langBtn, x: 0, y: 7, width: 48, value: 'عربي', fontFamily: 'Noto Sans Arabic', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: COCOA_SOFT });
  bindVar(langTxt, 'i18n_lang_btn');

  const cartBtn = frame({ name: 'Hdr Cart Hitbox', parent: hdr, x: 268, y: 14, width: 74, height: 36, fill: CREAM_CARD, radius: 999 });
  text({ name: 'Hdr Cart Txt', parent: cartBtn, x: 0, y: 10, width: 74, value: 'Bag (1)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, textAlign: 'center', fill: COCOA });

  const menuBtn = frame({ name: 'Hdr Drawer Hitbox', parent: hdr, x: 350, y: 14, width: 38, height: 36, fill: CREAM, radius: 8 });
  rect({ name: 'B1', parent: menuBtn, x: 8, y: 10, width: 22, height: 2.2, fill: COCOA, radius: 2 });
  rect({ name: 'B2', parent: menuBtn, x: 8, y: 17, width: 22, height: 2.2, fill: COCOA, radius: 2 });
  rect({ name: 'B3', parent: menuBtn, x: 8, y: 24, width: 22, height: 2.2, fill: COCOA, radius: 2 });

  return { hdr, logoBtn, langBtn, cartBtn, menuBtn, bottomCartBtn };
}

// --- Mobile Onboarding (01A, 01B, 01C, 01D) with Stacked Cocoa Pod + SAVORY Wordmark ---
const onboardMedia = [
  { name: '01A · Onboarding — Video 1 (Dubai Crepe)', img: IMG('reel-dubai-crepe.jpg'), ar: false },
  { name: '01B · Onboarding — Video 2 (Cinnamon Rolls)', img: IMG('reel-cinnamon-rolls.jpg'), ar: false },
  { name: '01C · Onboarding — Video 3 (Strawberry Crepe)', img: IMG('reel-strawberry-crepe.jpg'), ar: false },
  { name: '01D · Onboarding — Video 4 (London Cake)', img: IMG('reel-london-cake.jpg'), ar: false },
];

const mOnboard = onboardMedia.map((om, si) => {
  const pos = pPos(si);
  const fId = frame({ name: om.name, x: pos.x, y: pos.y, width: PW, height: PH, fill: ESPRESSO, clip: true });

  // Sliding 4-slide video track for Smart Animate swipe!
  const track = frame({ name: 'Onboarding Video Track', parent: fId, x: -si * PW, y: 0, width: PW * 4, height: PH, fill: ESPRESSO, clip: false });
  onboardMedia.forEach((m, mi) => {
    imageBox({ name: `Video Poster ${mi + 1}`, parent: track, x: mi * PW, y: 0, width: PW, height: PH, file: m.img, radius: 0 });
  });

  // Cinematic scrim gradient + subtle radial vignette
  gradientRect({
    name: 'Onboarding TopBottom Scrim',
    parent: fId,
    x: 0,
    y: 0,
    width: PW,
    height: PH,
    stops: ['#140702AA', '#14070244', '#140702CC'],
    from: [0.5, 0],
    to: [0.5, 1],
  });

  // Bilingual button top right (transparent fill, full opacity text!)
  const langBtn = frame({ name: 'Onboard Lang Hitbox', parent: fId, x: PW - 76, y: 24, width: 58, height: 34, fill: '#00000000' });
  const langTxt = text({ name: 'Onboard Lang Txt', parent: langBtn, x: 0, y: 6, width: 58, value: 'عربي', fontFamily: 'Noto Sans Arabic', fontStyle: 'Bold', fontSize: 15, textAlign: 'right', fill: CREAM });
  bindVar(langTxt, 'i18n_lang_btn');

  // Borderless floating left & right arrows
  const prevArrow = frame({ name: 'Onboard Prev Hitbox', parent: fId, x: 8, y: 400, width: 48, height: 68, fill: '#00000000' });
  text({ name: 'Onboard Prev Arrow', parent: prevArrow, x: 0, y: 18, width: 48, value: '←', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 26, textAlign: 'center', fill: CREAM });

  const nextArrow = frame({ name: 'Onboard Next Hitbox', parent: fId, x: PW - 56, y: 400, width: 48, height: 68, fill: '#00000000' });
  text({ name: 'Onboard Next Arrow', parent: nextArrow, x: 0, y: 18, width: 48, value: '→', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 26, textAlign: 'center', fill: CREAM });

  // Authentic Stacked SAVORY Cocoa Emblem + Wordmark in Cream
  addInlineLogo(fId, { x: PW / 2, y: 294, markHeight: 68, wordHeight: 28, color: CREAM, stacked: true });

  // Soft Elevated Cream Pill CTA: ORDER NOW ->
  const orderBtn = frame({ name: 'Onboard Order CTA', parent: fId, x: 101, y: 432, width: 200, height: 50, fill: CREAM, radius: 999 });
  shadow(orderBtn, { color: '#00000066', offset: [0, 14], radius: 30, spread: -4 });
  const orderTxt = text({ name: 'Onboard Order Txt', parent: orderBtn, x: 0, y: 15, width: 200, value: 'ORDER NOW  →', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, letterSpacing: '10%', textAlign: 'center', fill: COCOA });
  bindVar(orderTxt, 'i18n_order_now');

  // Interactive Slide Caption Pill
  const captions = [
    'Dubai Kunafa Pistachio Crepe · 184K views',
    'Warm Frosted Cinnamon Rolls · Baked Fresh',
    'Strawberry Belgian Fondue · Aramoun & Aley',
    'London Melt Chocolate Cake · 70% Couverture',
  ];
  text({ name: 'Video Caption', parent: fId, x: 32, y: 780, width: PW - 64, value: captions[si], fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 12, textAlign: 'center', fill: CREAM, opacity: 0.78 });

  // Morphing Progress Dots
  const dotXs = [154, 178, 202, 226];
  const dots = [0, 1, 2, 3].map((di) => {
    const active = di === si;
    return rect({
      name: `Onboard Dot ${di + 1}`,
      parent: fId,
      x: active ? dotXs[di] - 6 : dotXs[di],
      y: 816,
      width: active ? 24 : 8,
      height: 6,
      fill: active ? GOLD : CREAM,
      opacity: active ? 1 : 0.4,
      radius: 999,
    });
  });

  return { fId, prevArrow, nextArrow, orderBtn, langBtn, dots };
});

// --- Helper for Mobile Menu Home (02A/B/C carousel states + 02F Filtered Pistachio state) ---
function buildPhoneMenuHome(idx, { slideIndex = 0, filteredPistachio = false } = {}) {
  const frameTitle = filteredPistachio
    ? '02F · Menu — Filtered: Pistachio (Scrollable)'
    : `02${['A', 'B', 'C'][slideIndex]} · Menu Home — Slide 0${slideIndex + 1} (Scrollable)`;
  const pos = pPos(idx);
  const fId = frame({ name: frameTitle, x: pos.x, y: pos.y, width: PW, height: PH, fill: CREAM, overflow: 'vertical' });

  // Editorial Split Section (y = 84..)
  const featTitle = text({ name: 'Menu Featured Heading', parent: fId, x: 20, y: 84, width: 362, value: 'Featured', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 42, fill: COCOA });
  bindVar(featTitle, 'i18n_featured');
  const featSub = text({ name: 'Menu Featured Sub', parent: fId, x: 20, y: 134, width: 356, value: 'Discover our signature handcrafted chocolates, warm crepes, and seasonal specials.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 13, lineHeight: 20, fill: COCOA_SOFT });
  bindVar(featSub, 'i18n_featured_sub');

  // Top borderless index bar: <- 01 02 03 ->
  const prevBtn = frame({ name: 'Slider Prev Btn', parent: fId, x: 20, y: 186, width: 36, height: 32, fill: CREAM, radius: 6 });
  text({ name: 'Slider Prev Txt', parent: prevBtn, x: 0, y: 5, width: 36, value: '←', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'center', fill: COCOA });

  const idxBtns = [0, 1, 2].map((ii) => {
    const active = ii === slideIndex;
    const b = frame({ name: `Slider Idx 0${ii + 1}`, parent: fId, x: 60 + ii * 44, y: 186, width: 40, height: 32, fill: active ? CREAM_CARD : CREAM, radius: 6 });
    text({ name: `Slider Idx 0${ii + 1} Txt`, parent: b, x: 0, y: 7, width: 40, value: `0${ii + 1}`, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: active ? COCOA : MUTED });
    return b;
  });

  const nextBtn = frame({ name: 'Slider Next Btn', parent: fId, x: 196, y: 186, width: 36, height: 32, fill: CREAM, radius: 6 });
  text({ name: 'Slider Next Txt', parent: nextBtn, x: 0, y: 5, width: 36, value: '→', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'center', fill: COCOA });

  // Horizontal Scrollable + Smart-Animate Carousel Viewport!
  const viewport = frame({ name: 'Featured Viewport Scroll', parent: fId, x: 20, y: 230, width: 382, height: 312, fill: CREAM, clip: true, overflow: 'horizontal' });
  const track = frame({ name: 'Featured Slider Track', parent: viewport, x: -slideIndex * 250, y: 0, width: 1260, height: 312, fill: CREAM, clip: false });

  const featItems = [
    { name: 'Dubai Kunafa Crepe', price: '$9.50', img: IMG('reel-dubai-crepe.jpg'), target: 'crepe' },
    { name: 'Warm Cinnamon Rolls', price: '$5.50', img: IMG('reel-cinnamon-rolls.jpg'), target: 'crepe' },
    { name: 'Pistachio Belgian Waffle', price: '$9.00', img: IMG('menu-pistachio-waffle.jpg'), target: 'bar' },
    { name: 'London Chocolate Cake', price: '$28.00', img: IMG('reel-london-cake.jpg'), target: 'bar' },
    { name: 'Golden Kunafa Cookie', price: '$7.50', img: IMG('reel-kunafa-cookie.jpg'), target: 'bar' },
  ];
  const featCards = [];
  featItems.forEach((it, i) => {
    const cf = frame({ name: `Featured Card ${i + 1}`, parent: track, x: i * 250, y: 0, width: 236, height: 306, fill: CREAM });
    imageBox({ name: `Featured Photo ${i + 1}`, parent: cf, x: 0, y: 0, width: 236, height: 236, file: it.img, radius: 10, withShadow: true });
    text({ name: `Featured Name ${i + 1}`, parent: cf, x: 0, y: 248, width: 174, value: it.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 17, lineHeight: 22, fill: COCOA });
    text({ name: `Featured Price ${i + 1}`, parent: cf, x: 178, y: 250, width: 58, value: it.price, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'right', fill: COCOA_SOFT });
    featCards.push({ cf, target: it.target });
  });

  // Search Input Underline + Interactive Filter Bar (y = 556)
  rect({ name: 'Search Top Divider', parent: fId, x: 20, y: 556, width: 362, height: 1, fill: BORDER_LINE });
  const searchTxt = text({ name: 'Search Label', parent: fId, x: 20, y: 572, width: 362, value: '⌕   Search menu…', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 15, fill: MUTED });
  bindVar(searchTxt, 'i18n_search');
  rect({ name: 'Search Underline', parent: fId, x: 20, y: 604, width: 362, height: 1, fill: COCOA });

  // Horizontal scrollable filter pills
  const pillAll = frame({ name: 'Filter Pill All', parent: fId, x: 20, y: 618, width: 46, height: 32, fill: filteredPistachio ? CREAM : CREAM_CARD, radius: 8 });
  text({ name: 'Filter All Txt', parent: pillAll, x: 0, y: 7, width: 46, value: 'All', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: filteredPistachio ? COCOA_SOFT : COCOA });

  const pillPop = frame({ name: 'Filter Pill Popular', parent: fId, x: 74, y: 618, width: 72, height: 32, fill: CREAM, radius: 8 });
  text({ name: 'Filter Pop Txt', parent: pillPop, x: 0, y: 7, width: 72, value: 'Popular', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: COCOA_SOFT });

  const pillPist = frame({ name: 'Filter Pill Pistachio', parent: fId, x: 154, y: 618, width: 82, height: 32, fill: filteredPistachio ? COCOA : CREAM, radius: 8 });
  text({ name: 'Filter Pist Txt', parent: pillPist, x: 0, y: 7, width: 82, value: 'Pistachio', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: filteredPistachio ? CREAM : COCOA_SOFT });

  text({ name: 'Filter Dark', parent: fId, x: 244, y: 625, value: 'Dark', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, fill: COCOA_SOFT });
  text({ name: 'Filter Under10', parent: fId, x: 294, y: 625, value: 'Under $10', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, fill: COCOA_SOFT });

  const catCards = [];
  const filterProdCards = [];

  if (filteredPistachio) {
    // Filtered Pistachio View directly below toolbar!
    text({ name: 'Filtered Results Title', parent: fId, x: 20, y: 676, value: 'Showing 4 Pistachio Creations', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 24, fill: COCOA });
    const pItems = [
      { name: 'Dubai Kunafa Crepe', price: '$9.50', img: IMG('reel-dubai-crepe.jpg'), target: 'crepe' },
      { name: 'Pistachio Kunafa Bar', price: '$14.00', img: IMG('ig-kunafa-cookie-drip.jpg'), target: 'bar' },
      { name: 'Pistachio Waffle', price: '$9.00', img: IMG('menu-pistachio-waffle.jpg'), target: 'bar' },
      { name: 'Kunafa Eclair Box', price: '$11.00', img: IMG('ig-kunafa-eclair.jpg'), target: 'bar' },
    ];
    pItems.forEach((pi, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = 20 + col * 187;
      const py = 720 + row * 246;
      const pc = frame({ name: `Filtered Card ${i + 1}`, parent: fId, x: px, y: py, width: 175, height: 228, fill: CREAM });
      text({ name: `Filt Title ${i}`, parent: pc, x: 0, y: 0, width: 175, value: pi.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, fill: COCOA });
      text({ name: `Filt Price ${i}`, parent: pc, x: 0, y: 24, value: pi.price, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, fill: COCOA_SOFT });
      imageBox({ name: `Filt Img ${i}`, parent: pc, x: 0, y: 50, width: 175, height: 170, file: pi.img, radius: 10 });
      filterProdCards.push({ cf: pc, target: pi.target });
    });
  } else {
    // Categories Section (6 Clean Image-Only Category Cards)
    const catHead = text({ name: 'Categories Heading', parent: fId, x: 20, y: 674, value: 'Categories', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 28, fill: COCOA });
    bindVar(catHead, 'i18n_categories');

    const cats = [
      { name: 'Crepes & Waffles', img: IMG('reel-strawberry-crepe.jpg'), dest: 'cat_crepes' },
      { name: 'Chocolates & Bark', img: IMG('ig-kunafa-cookie-drip.jpg'), dest: 'cat_choco' },
      { name: 'Signature Gateaux', img: IMG('reel-london-cake.jpg'), dest: 'cat_choco' },
      { name: 'Flurry & Shakes', img: IMG('menu-icecream-cup.jpg'), dest: 'cat_crepes' },
      { name: 'Cakes by the slice', img: IMG('cake-moms-slice.jpg'), dest: 'cat_choco' },
      { name: 'Luxury Gift Boxes', img: IMG('gift-eid-box.jpg'), dest: 'gift_modal' },
    ];

    cats.forEach((ct, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 20 + col * 187;
      const cy = 720 + row * 194;
      const card = frame({ name: `Cat Card ${ct.name}`, parent: fId, x: cx, y: cy, width: 175, height: 180, fill: CREAM });
      text({ name: `Cat Label ${ct.name}`, parent: card, x: 0, y: 0, width: 175, value: ct.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 17, fill: COCOA });
      imageBox({ name: `Cat Img ${ct.name}`, parent: card, x: 0, y: 30, width: 175, height: 142, file: ct.img, radius: 10, withShadow: true });
      catCards.push({ card, dest: ct.dest });
    });
  }

  // Horizontal Scrollable Instagram Reels Strip (y = 1326)
  const reelsY = filteredPistachio ? 1236 : 1326;
  const reelsHead = text({ name: 'Reels Title', parent: fId, x: 20, y: reelsY, value: '@savory.chocolate Reels', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 24, fill: COCOA });
  bindVar(reelsHead, 'i18n_reels');

  const reelsStrip = frame({ name: 'Reels Horizontal Strip', parent: fId, x: 20, y: reelsY + 42, width: 382, height: 292, fill: CREAM, clip: true, overflow: 'horizontal' });
  const reelData = [
    { name: 'Dubai Kunafa Crepe', views: '▶ 184K', img: IMG('reel-dubai-crepe.jpg'), target: 'crepe' },
    { name: 'Cinnamon Rolls', views: '▶ 96K', img: IMG('reel-cinnamon-rolls.jpg'), target: 'crepe' },
    { name: 'Kunafa Cookie', views: '▶ 142K', img: IMG('reel-kunafa-cookie.jpg'), target: 'bar' },
    { name: 'London Melt Cake', views: '▶ 210K', img: IMG('reel-london-cake.jpg'), target: 'bar' },
    { name: 'Strawberry Crepe', views: '▶ 88K', img: IMG('reel-strawberry-crepe.jpg'), target: 'crepe' },
    { name: 'Pancake Stack', views: '▶ 74K', img: IMG('reel-pancakes.jpg'), target: 'crepe' },
  ];
  const reelCards = [];
  reelData.forEach((rl, i) => {
    const rx = i * 168;
    const rc = frame({ name: `Reel Card ${i + 1}`, parent: reelsStrip, x: rx, y: 0, width: 156, height: 286, fill: CREAM });
    imageBox({ name: `Reel Video ${i + 1}`, parent: rc, x: 0, y: 0, width: 156, height: 236, file: rl.img, radius: 10 });
    rect({ name: `Reel Views BG ${i + 1}`, parent: rc, x: 10, y: 10, width: 64, height: 22, fill: ESPRESSO, opacity: 0.78, radius: 999 });
    text({ name: `Reel Views Txt ${i + 1}`, parent: rc, x: 10, y: 15, width: 64, value: rl.views, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 10, textAlign: 'center', fill: CREAM });
    circle({ name: `Reel Play Badge ${i + 1}`, parent: rc, x: 58, y: 98, size: 40, fill: CREAM, opacity: 0.92 });
    text({ name: `Reel Play Tri ${i + 1}`, parent: rc, x: 58, y: 109, width: 40, value: '▶', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: COCOA });
    text({ name: `Reel Name ${i + 1}`, parent: rc, x: 0, y: 244, width: 156, value: rl.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, fill: COCOA });
    text({ name: `Reel Link ${i + 1}`, parent: rc, x: 0, y: 266, value: 'Order →', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, fill: COCOA_SOFT });
    reelCards.push({ rc, target: rl.target });
  });

  // Visit Our Branches Section at Bottom (+ bottom clearance for floating cart pill!)
  const branchY = reelsY + 360;
  rect({ name: 'Branch Divider', parent: fId, x: 20, y: branchY, width: 362, height: 1, fill: BORDER_LINE });
  text({ name: 'Branch Title', parent: fId, x: 20, y: branchY + 22, value: 'Visit Our Branches', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 24, fill: COCOA });
  text({ name: 'Branch Copy', parent: fId, x: 20, y: branchY + 58, width: 362, value: 'Open Daily · 10:00 AM – 11:30 PM\nAramoun Main Road  ·  +961 70 123 456\nAley Khoury Center  ·  +961 76 548 200', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 13, lineHeight: 22, fill: COCOA_SOFT });
  rect({ name: 'Bottom Scroll Pad', parent: fId, x: 0, y: branchY + 140, width: 10, height: 96, fill: CREAM, opacity: 0.01 });

  // Fixed Header & Fixed Bottom Cart Bar (added LAST so they stay pinned ON TOP during scroll!)
  const fixedUi = addFixedMobileHeader(fId, { showFloatingCart: true, cartTotal: '$12.00' });

  return { fId, fixedUi, prevBtn, idxBtns, nextBtn, viewport, pillAll, pillPist, featCards, catCards, filterProdCards, reelCards };
}

const m02A = buildPhoneMenuHome(4, { slideIndex: 0 });
const m02B = buildPhoneMenuHome(5, { slideIndex: 1 });
const m02C = buildPhoneMenuHome(6, { slideIndex: 2 });
const m02F = buildPhoneMenuHome(7, { slideIndex: 0, filteredPistachio: true });

// --- Mobile Overlay 02D: Slide-Over Navigation Drawer (openOverlay target) ---
const posDrawer = pPos(8);
const mDrawerOverlay = frame({ name: 'OVERLAY · Mobile Navigation Drawer', x: posDrawer.x, y: posDrawer.y, width: 332, height: PH, fill: ESPRESSO });
addInlineLogo(mDrawerOverlay, { x: 24, y: 20, markHeight: 28, wordHeight: 16, color: CREAM });
const drawerCloseBtn = frame({ name: 'Drawer Close Hitbox', parent: mDrawerOverlay, x: 274, y: 14, width: 42, height: 42, fill: ESPRESSO });
text({ name: 'Drawer Close X', parent: drawerCloseBtn, x: 0, y: 7, width: 42, value: '✕', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 22, textAlign: 'center', fill: CREAM });
rect({ name: 'Drawer Top Rule', parent: mDrawerOverlay, x: 24, y: 72, width: 284, height: 1, fill: '#4A2410' });

const drawerStudioBtn = frame({ name: 'Drawer Studio Card', parent: mDrawerOverlay, x: 24, y: 92, width: 284, height: 74, fill: ESPRESSO_CARD, radius: 12 });
text({ name: 'Drawer Studio Sub', parent: drawerStudioBtn, x: 16, y: 14, value: 'SAVORY 3D CUSTOM STUDIO', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 10, letterSpacing: '10%', fill: GOLD });
text({ name: 'Drawer Studio Title', parent: drawerStudioBtn, x: 16, y: 34, value: '3D Cake Studio  ↗', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 21, fill: CREAM });

const drawerItems = [
  { num: '01', name: 'Menu', desc: 'Featured & categories' },
  { num: '02', name: 'Gift Boxes', desc: 'Build 9, 16 or 25-piece box' },
  { num: '03', name: 'Cart & Checkout', desc: 'Review items & place order' },
  { num: '04', name: 'Order Tracker', desc: 'Live kitchen status (#SAV-409)' },
  { num: '05', name: 'Aramoun & Aley', desc: 'Open daily 10 AM – 11:30 PM' },
];
const drawerRows = drawerItems.map((di, i) => {
  const row = frame({ name: `Drawer Row ${di.name}`, parent: mDrawerOverlay, x: 24, y: 188 + i * 86, width: 284, height: 76, fill: ESPRESSO });
  text({ name: `DR Num ${i}`, parent: row, x: 0, y: 16, value: di.num, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 11, fill: GOLD });
  text({ name: `DR Name ${i}`, parent: row, x: 30, y: 8, value: di.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 24, fill: CREAM });
  text({ name: `DR Desc ${i}`, parent: row, x: 30, y: 42, value: di.desc, fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 12, fill: GOLD, opacity: 0.75 });
  text({ name: `DR Arr ${i}`, parent: row, x: 260, y: 16, value: '→', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, fill: GOLD });
  rect({ name: `DR Line ${i}`, parent: row, x: 0, y: 74, width: 284, height: 1, fill: '#3E1C0B' });
  return row;
});

rect({ name: 'Drawer WA Btn', parent: mDrawerOverlay, x: 24, y: 786, width: 284, height: 48, fill: WHATSAPP_GREEN, radius: 999 });
text({ name: 'Drawer WA Txt', parent: mDrawerOverlay, x: 24, y: 801, width: 284, value: 'WhatsApp Concierge', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: '#FFFFFF' });

// --- Mobile Overlay 02G: Build Your Gift Box Studio Modal ---
const posGift = pPos(9);
const mGiftModal = frame({ name: 'OVERLAY · Luxury Gift Box Studio', x: posGift.x, y: posGift.y, width: 370, height: 610, fill: CREAM, radius: 22 });
shadow(mGiftModal, { color: '#14070277', offset: [0, 20], radius: 44, spread: 0 });
text({ name: 'Gift Eyebrow', parent: mGiftModal, x: 24, y: 24, value: 'SAVORY CHOCOLATIER', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 11, letterSpacing: '12%', fill: MUTED });
text({ name: 'Gift Heading', parent: mGiftModal, x: 24, y: 44, value: 'Build Your Gift Box', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 28, fill: COCOA });
const giftCloseBtn = frame({ name: 'Gift Close Hitbox', parent: mGiftModal, x: 318, y: 20, width: 34, height: 34, fill: CREAM_CARD, radius: 999 });
text({ name: 'Gift Close X', parent: giftCloseBtn, x: 0, y: 6, width: 34, value: '✕', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'center', fill: COCOA });

// Box Size Pills
rect({ name: 'Size 9 Active', parent: mGiftModal, x: 24, y: 94, width: 102, height: 50, fill: COCOA, radius: 10 });
text({ name: 'Size 9 Txt', parent: mGiftModal, x: 24, y: 104, width: 102, value: '9 Pieces\n$18.00 · 3×3', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, lineHeight: 16, textAlign: 'center', fill: CREAM });
rect({ name: 'Size 16', parent: mGiftModal, x: 134, y: 94, width: 102, height: 50, fill: CREAM_CARD, radius: 10 });
text({ name: 'Size 16 Txt', parent: mGiftModal, x: 134, y: 104, width: 102, value: '16 Pieces\n$30.00 · 4×4', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, lineHeight: 16, textAlign: 'center', fill: COCOA });
rect({ name: 'Size 25', parent: mGiftModal, x: 244, y: 94, width: 102, height: 50, fill: CREAM_CARD, radius: 10 });
text({ name: 'Size 25 Txt', parent: mGiftModal, x: 244, y: 104, width: 102, value: '25 Pieces\n$45.00 · 5×5', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, lineHeight: 16, textAlign: 'center', fill: COCOA });

// 3x3 Truffle Tray Visual
rect({ name: 'Gift Tray Box', parent: mGiftModal, x: 65, y: 164, width: 240, height: 240, fill: ESPRESSO, radius: 16, stroke: GOLD, strokeWeight: 2 });
const truffleColors = ['#96bc61', '#5c2c12', '#c67d2d', '#2b1206', '#b56e33', '#8c1832', '#3b1c0c', '#f3dfba', '#96bc61'];
truffleColors.forEach((colHex, ti) => {
  const cCol = ti % 3;
  const cRow = Math.floor(ti / 3);
  circle({ name: `Truffle ${ti + 1}`, parent: mGiftModal, x: 93 + cCol * 66, y: 192 + cRow * 66, size: 52, fill: colHex, stroke: '#D9B06666', strokeWeight: 1.5 });
});

text({ name: 'Gift Flavors Note', parent: mGiftModal, x: 24, y: 422, width: 322, value: '✦  9 / 9 Signature Truffles Filled\nRibbon: Deep Cocoa Satin  ·  Optional Gift Card Note', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 13, lineHeight: 21, textAlign: 'center', fill: COCOA_SOFT });

const giftAddBtn = frame({ name: 'Gift Add CTA', parent: mGiftModal, x: 24, y: 536, width: 322, height: 50, fill: COCOA, radius: 10 });
text({ name: 'Gift Add Txt', parent: giftAddBtn, x: 0, y: 15, width: 322, value: 'Add 9-Piece Gift Box  ·  $18.00  →', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'center', fill: CREAM });

// --- Two Real Category Pages: 03A (Crepes & Waffles) & 03B (Chocolates & Bark) ---
function buildPhoneCategoryPage(idx, { title, activeTab, productsList }) {
  const pos = pPos(idx);
  const fId = frame({ name: `03 · Category — ${title} (Scrollable)`, x: pos.x, y: pos.y, width: PW, height: PH, fill: CREAM, overflow: 'vertical' });

  const backBtn = frame({ name: 'Cat Back Hitbox', parent: fId, x: 20, y: 82, width: 154, height: 30, fill: CREAM });
  text({ name: 'Cat Back Txt', parent: backBtn, x: 0, y: 5, value: '←  All Categories', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: COCOA_SOFT });
  text({ name: 'Cat Heading', parent: fId, x: 20, y: 120, value: title, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 34, fill: COCOA });

  // Horizontal scrollable Category Switcher Pills
  const pillsBar = frame({ name: 'Cat Pills Switcher', parent: fId, x: 20, y: 170, width: 382, height: 36, fill: CREAM, overflow: 'horizontal' });
  const pillCrepes = frame({ name: 'Switch Pill Crepes', parent: pillsBar, x: 0, y: 0, width: 142, height: 32, fill: activeTab === 'crepes' ? CREAM_CARD : CREAM, radius: 8 });
  text({ name: 'Switch Pill Crepes T', parent: pillCrepes, x: 0, y: 7, width: 142, value: 'Crepes & Waffles', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: activeTab === 'crepes' ? COCOA : MUTED });
  const pillChoco = frame({ name: 'Switch Pill Choco', parent: pillsBar, x: 150, y: 0, width: 146, height: 32, fill: activeTab === 'choco' ? CREAM_CARD : CREAM, radius: 8 });
  text({ name: 'Switch Pill Choco T', parent: pillChoco, x: 0, y: 7, width: 146, value: 'Chocolates & Bark', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: activeTab === 'choco' ? COCOA : MUTED });
  text({ name: 'Switch Pill Gateaux', parent: pillsBar, x: 308, y: 7, value: 'Gateaux     Shakes', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, fill: MUTED });

  const prodCards = [];
  productsList.forEach((pr, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const px = 20 + col * 187;
    const py = 224 + row * 268;
    const pc = frame({ name: `Cat Prod ${pr.name}`, parent: fId, x: px, y: py, width: 175, height: 250, fill: CREAM });
    text({ name: `Cat Prod Name ${i}`, parent: pc, x: 0, y: 0, width: 175, value: pr.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, lineHeight: 19, fill: COCOA });
    text({ name: `Cat Prod Price ${i}`, parent: pc, x: 0, y: 42, value: pr.price, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, fill: COCOA_SOFT });
    imageBox({ name: `Cat Prod Img ${i}`, parent: pc, x: 0, y: 66, width: 175, height: 172, file: pr.img, radius: 10, withShadow: true });
    prodCards.push({ pc, target: pr.target });
  });
  rect({ name: 'Cat Bottom Pad', parent: fId, x: 0, y: 1050, width: 10, height: 96, fill: CREAM, opacity: 0.01 });

  const fixedUi = addFixedMobileHeader(fId, { showFloatingCart: true, cartTotal: '$12.00' });
  return { fId, fixedUi, backBtn, pillCrepes, pillChoco, prodCards };
}

const m03A = buildPhoneCategoryPage(10, {
  title: 'Crepes & Waffles',
  activeTab: 'crepes',
  productsList: [
    { name: 'Dubai Kunafa Crepe', price: '$9.50', img: IMG('reel-dubai-crepe.jpg'), target: 'crepe' },
    { name: 'Strawberry Nutella Crepe', price: '$8.50', img: IMG('reel-strawberry-crepe.jpg'), target: 'crepe' },
    { name: 'Pistachio Belgian Waffle', price: '$9.00', img: IMG('menu-pistachio-waffle.jpg'), target: 'bar' },
    { name: 'Warm Cinnamon Rolls', price: '$5.50', img: IMG('reel-cinnamon-rolls.jpg'), target: 'crepe' },
    { name: 'Golden Kunafa Cookie', price: '$7.50', img: IMG('reel-kunafa-cookie.jpg'), target: 'bar' },
    { name: 'Belgian Pancake Stack', price: '$8.00', img: IMG('reel-pancakes.jpg'), target: 'crepe' },
  ],
});

const m03B = buildPhoneCategoryPage(11, {
  title: 'Chocolates & Bark',
  activeTab: 'choco',
  productsList: [
    { name: 'Pistachio Kunafa Bar', price: '$14.00', img: IMG('ig-kunafa-cookie-drip.jpg'), target: 'bar' },
    { name: 'Kunafa Eclair Quartet', price: '$11.00', img: IMG('ig-kunafa-eclair.jpg'), target: 'bar' },
    { name: 'SAVORY Tasting Box', price: '$18.00', img: IMG('ig-savory-box.jpg'), target: 'bar' },
    { name: 'Eid Luxury Assortment', price: '$30.00', img: IMG('gift-eid-box.jpg'), target: 'bar' },
    { name: 'Donut Couverture Box', price: '$12.50', img: IMG('menu-donuts-platter.jpg'), target: 'bar' },
    { name: 'Dessert Cups Selection', price: '$10.00', img: IMG('menu-dessert-cups.jpg'), target: 'bar' },
  ],
});

// --- Dedicated Borderless Product Pages: 04A (Crepe Default), 04B (Crepe Customized), 04C (Pistachio Bar) ---
function buildPhoneProductPage(idx, { variant = 'crepe_default' } = {}) {
  const isBar = variant === 'bar';
  const customized = variant === 'crepe_custom';
  const frameTitle = isBar
    ? '04C · Product — Pistachio Kunafa Bar ($14.00)'
    : customized
      ? '04B · Product — Customized ($12.00)'
      : '04A · Product — Dubai Crepe ($9.50)';

  const pos = pPos(idx);
  const fId = frame({ name: frameTitle, x: pos.x, y: pos.y, width: PW, height: PH, fill: CREAM, overflow: 'vertical' });

  const backBtn = frame({ name: 'Prod Back Hitbox', parent: fId, x: 20, y: 82, width: 184, height: 30, fill: CREAM });
  text({ name: 'Prod Back Txt', parent: backBtn, x: 0, y: 5, value: isBar ? '←  Chocolates & Bark' : '←  Crepes & Waffles', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: COCOA_SOFT });

  imageBox({
    name: 'Prod Square Photo',
    parent: fId,
    x: 20,
    y: 122,
    width: 362,
    height: 350,
    file: isBar ? IMG('ig-kunafa-cookie-drip.jpg') : IMG('reel-dubai-crepe.jpg'),
    radius: 12,
    withShadow: true,
  });

  text({
    name: 'Prod Title',
    parent: fId,
    x: 20,
    y: 492,
    width: 362,
    value: isBar ? 'Signature Pistachio Kunafa Chocolate Bar' : 'Dubai Kunafa Chocolate Crepe',
    fontFamily: 'Cabin',
    fontStyle: 'Bold',
    fontSize: 28,
    lineHeight: 34,
    fill: COCOA,
  });

  const livePriceText = isBar ? '$14.00' : customized ? '$12.00' : '$9.50';
  text({ name: 'Prod Price Live', parent: fId, x: 20, y: 572, value: livePriceText, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 22, fill: COCOA });
  rect({ name: 'Prod Header Line', parent: fId, x: 20, y: 608, width: 362, height: 1, fill: BORDER_LINE });

  text({
    name: 'Prod Description',
    parent: fId,
    x: 20,
    y: 626,
    width: 362,
    value: isBar
      ? 'Thick tempered Belgian milk or dark shell hand-filled with toasted pistachio kataifi praline and roasted Aleppo pistachios.'
      : 'Hand-rolled warm crepe filled with crispy roasted kataifi pastry and Lebanese pistachio cream, drenched in Belgian milk, dark and white chocolate ribbons.',
    fontFamily: 'Cabin',
    fontStyle: 'Regular',
    fontSize: 14,
    lineHeight: 22,
    fill: COCOA_SOFT,
  });

  text({ name: 'Prod Opt 1 Label', parent: fId, x: 20, y: 714, value: isBar ? 'COUVERTURE SHELL' : 'DRIZZLE STYLE', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, letterSpacing: '8%', fill: COCOA });
  text({ name: 'Prod Opt 1 Req', parent: fId, x: 300, y: 714, width: 82, value: 'Required', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 12, textAlign: 'right', fill: MUTED });

  const chip1 = frame({ name: 'Chip Drizzle 1', parent: fId, x: 20, y: 742, width: 226, height: 38, fill: customized ? CREAM_CARD : COCOA, radius: 8 });
  text({ name: 'Chip Drizzle 1 T', parent: chip1, x: 0, y: 10, width: 226, value: isBar ? 'Belgian Milk Chocolate 38%' : 'Triple Chocolate & Pistachio', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: customized ? COCOA : CREAM });

  const chip2 = frame({ name: 'Chip Drizzle 2', parent: fId, x: 20, y: 790, width: 244, height: 38, fill: customized ? COCOA : CREAM_CARD, radius: 8 });
  text({ name: 'Chip Drizzle 2 T', parent: chip2, x: 0, y: 10, width: 244, value: isBar ? 'Dark 70% Couverture' : 'Dark 70% & Pistachio (+$0.50)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: customized ? CREAM : COCOA });

  rect({ name: 'Prod Opt 1 Line', parent: fId, x: 20, y: 846, width: 362, height: 1, fill: BORDER_LINE });
  text({ name: 'Prod Opt 2 Label', parent: fId, x: 20, y: 864, value: 'EXTRAS', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, letterSpacing: '8%', fill: COCOA });
  text({ name: 'Prod Opt 2 Req', parent: fId, x: 300, y: 864, width: 82, value: 'Optional', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 12, textAlign: 'right', fill: MUTED });

  const extra1 = frame({ name: 'Extra Row 1 Hitbox', parent: fId, x: 20, y: 892, width: 362, height: 44, fill: CREAM });
  text({ name: 'Extra 1 Txt', parent: extra1, x: 0, y: 12, value: customized ? '☑   Extra pistachio kunafa crunch' : '☐   Extra pistachio kunafa crunch', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: COCOA });
  text({ name: 'Extra 1 Price', parent: extra1, x: 292, y: 12, width: 70, value: '+$2.00', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'right', fill: COCOA_SOFT });
  rect({ name: 'Extra 1 Hairline', parent: extra1, x: 0, y: 43, width: 362, height: 1, fill: BORDER_LINE });

  text({ name: 'Extra 2 Txt', parent: fId, x: 20, y: 948, value: isBar ? '☐   Gold leaf gift sleeve' : '☐   Fresh strawberries', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 14, fill: COCOA });
  text({ name: 'Extra 2 Price', parent: fId, x: 312, y: 948, width: 70, value: '+$1.50', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'right', fill: COCOA_SOFT });

  rect({ name: 'Prod Opt 2 Line', parent: fId, x: 20, y: 992, width: 362, height: 1, fill: BORDER_LINE });
  text({ name: 'Prod Note Title', parent: fId, x: 20, y: 1012, value: 'SPECIAL REQUESTS', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, letterSpacing: '8%', fill: COCOA });
  text({ name: 'Prod Note Hint', parent: fId, x: 20, y: 1042, value: 'Allergies, packaging notes, or special requests…', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 14, fill: MUTED });
  rect({ name: 'Prod Note Underline', parent: fId, x: 20, y: 1072, width: 362, height: 1, fill: COCOA });

  rect({ name: 'Prod Qty Box', parent: fId, x: 20, y: 1098, width: 106, height: 48, fill: CREAM_CARD, radius: 8 });
  text({ name: 'Prod Qty Txt', parent: fId, x: 20, y: 1113, width: 106, value: '−   1   +', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'center', fill: COCOA });

  const addBtn = frame({ name: 'Prod Add CTA', parent: fId, x: 138, y: 1098, width: 244, height: 48, fill: COCOA, radius: 8 });
  text({ name: 'Prod Add Txt', parent: addBtn, x: 0, y: 14, width: 244, value: `Add to Order  ·  ${livePriceText}`, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'center', fill: CREAM });

  rect({ name: 'Prod Bottom Pad', parent: fId, x: 0, y: 1156, width: 10, height: 70, fill: CREAM, opacity: 0.01 });

  const fixedUi = addFixedMobileHeader(fId, { showFloatingCart: false });
  return { fId, fixedUi, backBtn, chip1, chip2, extra1, addBtn };
}

const m04A = buildPhoneProductPage(12, { variant: 'crepe_default' });
const m04B = buildPhoneProductPage(13, { variant: 'crepe_custom' });
const m04C = buildPhoneProductPage(14, { variant: 'bar' });

// --- Cart & Checkout: 05A (Pickup) & 05B (Delivery +$3.00) ---
function buildPhoneCartPage(idx, { delivery = false } = {}) {
  const pos = pPos(idx);
  const fId = frame({ name: delivery ? '05B · Cart — Delivery ($15.00)' : '05A · Cart — Pickup ($12.00)', x: pos.x, y: pos.y, width: PW, height: PH, fill: CREAM, overflow: 'vertical' });

  const backBtn = frame({ name: 'Cart Back Hitbox', parent: fId, x: 20, y: 82, width: 170, height: 30, fill: CREAM });
  text({ name: 'Cart Back Txt', parent: backBtn, x: 0, y: 5, value: '←  Continue Shopping', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: COCOA_SOFT });
  const cartHead = text({ name: 'Cart Heading', parent: fId, x: 20, y: 120, value: 'Your Cart', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 34, fill: COCOA });
  bindVar(cartHead, 'i18n_cart');

  imageBox({ name: 'Cart Item Thumb', parent: fId, x: 20, y: 178, width: 72, height: 72, file: IMG('reel-dubai-crepe.jpg'), radius: 10 });
  text({ name: 'Cart Item Name', parent: fId, x: 106, y: 180, width: 200, value: 'Dubai Kunafa Crepe', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 19, fill: COCOA });
  text({ name: 'Cart Item Price', parent: fId, x: 312, y: 182, width: 70, value: '$12.00', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'right', fill: COCOA });
  text({ name: 'Cart Item Meta', parent: fId, x: 106, y: 206, width: 276, value: 'Dark 70% & Pistachio · Extra pistachio crunch', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 12, lineHeight: 18, fill: MUTED });
  rect({ name: 'Cart Line Rule', parent: fId, x: 20, y: 270, width: 362, height: 1, fill: BORDER_LINE });

  text({ name: 'Checkout Heading', parent: fId, x: 20, y: 292, value: 'Checkout Details', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 26, fill: COCOA });

  // Segmented Pickup / Delivery Pill (identically named children for Smart Animate!)
  rect({ name: 'Segmented BG', parent: fId, x: 20, y: 338, width: 362, height: 42, fill: CREAM_CARD, radius: 999 });
  rect({ name: 'Segmented Thumb', parent: fId, x: delivery ? 201 : 24, y: 342, width: 177, height: 34, fill: COCOA, radius: 999 });
  const pickupHit = frame({ name: 'Pickup Hitbox', parent: fId, x: 24, y: 342, width: 177, height: 34, fill: '#00000000' });
  text({ name: 'Pickup Label', parent: pickupHit, x: 0, y: 9, width: 177, value: 'Pickup', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: delivery ? COCOA_SOFT : CREAM });
  const deliveryHit = frame({ name: 'Delivery Hitbox', parent: fId, x: 201, y: 342, width: 177, height: 34, fill: '#00000000' });
  text({ name: 'Delivery Label', parent: deliveryHit, x: 0, y: 9, width: 177, value: 'Delivery (+$3.00)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: delivery ? CREAM : COCOA_SOFT });

  text({ name: 'Branch Lbl', parent: fId, x: 20, y: 402, value: delivery ? 'DELIVERY ADDRESS' : 'BRANCH  ·  ARAMOUN  /  ALEY', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, letterSpacing: '8%', fill: COCOA });
  rect({ name: 'Branch Input', parent: fId, x: 20, y: 428, width: 362, height: 46, fill: CREAM_SOFT, radius: 8, stroke: COCOA, strokeWeight: 1 });
  text({ name: 'Branch Val', parent: fId, x: 36, y: 442, value: delivery ? 'Aramoun · Facing Spinneys, Bldg 4' : '●   SAVORY Aramoun Boutique', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: COCOA });

  text({ name: 'Name Lbl', parent: fId, x: 20, y: 494, value: 'YOUR NAME', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, letterSpacing: '8%', fill: COCOA });
  rect({ name: 'Name Box', parent: fId, x: 20, y: 520, width: 362, height: 44, fill: CREAM_SOFT, radius: 8 });
  text({ name: 'Name Val', parent: fId, x: 36, y: 533, value: 'Nour Haddad', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 14, fill: COCOA });

  text({ name: 'Phone Lbl', parent: fId, x: 20, y: 582, value: 'WHATSAPP NUMBER', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, letterSpacing: '8%', fill: COCOA });
  rect({ name: 'Phone Box', parent: fId, x: 20, y: 608, width: 362, height: 44, fill: CREAM_SOFT, radius: 8 });
  text({ name: 'Phone Val', parent: fId, x: 36, y: 621, value: '+961 70 123 456', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 14, fill: COCOA });

  rect({ name: 'Total Rule', parent: fId, x: 20, y: 678, width: 362, height: 1, fill: BORDER_LINE });
  text({ name: 'Total Label', parent: fId, x: 20, y: 698, value: delivery ? 'Total (Pay on delivery)' : 'Total (Pay on pickup)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 22, fill: COCOA });
  text({ name: 'Total Price', parent: fId, x: 262, y: 698, width: 120, value: delivery ? '$15.00' : '$12.00', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 22, textAlign: 'right', fill: COCOA });

  const submitBtn = frame({ name: 'Submit Order CTA', parent: fId, x: 20, y: 756, width: 362, height: 52, fill: COCOA, radius: 8 });
  text({ name: 'Submit Order Txt', parent: submitBtn, x: 0, y: 16, width: 362, value: delivery ? 'Place Order  ·  $15.00' : 'Place Order  ·  $12.00', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'center', fill: CREAM });

  rect({ name: 'Cart Pad', parent: fId, x: 0, y: 824, width: 10, height: 48, fill: CREAM, opacity: 0.01 });
  const fixedUi = addFixedMobileHeader(fId, { showFloatingCart: false });
  return { fId, fixedUi, backBtn, pickupHit, deliveryHit, submitBtn };
}

const m05A = buildPhoneCartPage(15, { delivery: false });
const m05B = buildPhoneCartPage(16, { delivery: true });

// --- Order Confirmed 06 ---
const posConf = pPos(17);
const m06 = frame({ name: '06 · Order Confirmed (#SAV-409)', x: posConf.x, y: posConf.y, width: PW, height: PH, fill: CREAM });
text({ name: 'Conf Eyebrow', parent: m06, x: 20, y: 124, width: 362, value: 'THANK YOU, NOUR', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, letterSpacing: '12%', textAlign: 'center', fill: MUTED });
text({ name: 'Conf Title', parent: m06, x: 20, y: 152, width: 362, value: 'Your Order is Confirmed', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 34, lineHeight: 40, textAlign: 'center', fill: COCOA });
rect({ name: 'Conf Code Box', parent: m06, x: 56, y: 248, width: 290, height: 92, fill: CREAM_CARD, radius: 14 });
text({ name: 'Conf Code Lbl', parent: m06, x: 56, y: 266, width: 290, value: 'ORDER REFERENCE', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 11, letterSpacing: '12%', textAlign: 'center', fill: MUTED });
text({ name: 'Conf Code Val', parent: m06, x: 56, y: 288, width: 290, value: '#SAV-409', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 36, textAlign: 'center', fill: COCOA });
rect({ name: 'Conf WA Btn', parent: m06, x: 20, y: 374, width: 362, height: 54, fill: WHATSAPP_GREEN, radius: 10 });
text({ name: 'Conf WA Txt', parent: m06, x: 20, y: 392, width: 362, value: 'Send Order on WhatsApp  ↗', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'center', fill: '#FFFFFF' });
text({ name: 'Conf Summary', parent: m06, x: 24, y: 462, width: 354, value: 'Branch: SAVORY Aramoun\nPickup: Today at 6:30 PM\nTotal due on pickup: $12.00', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 14, lineHeight: 24, textAlign: 'center', fill: COCOA_SOFT });
const m06BackBtn = frame({ name: 'Conf Back Menu CTA', parent: m06, x: 56, y: 580, width: 290, height: 48, fill: CREAM_CARD, radius: 8 });
text({ name: 'Conf Back Menu Txt', parent: m06BackBtn, x: 0, y: 15, width: 290, value: '←  Back to Menu', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: COCOA });
const m06Hdr = addFixedMobileHeader(m06, { showFloatingCart: false });

// --- Wire ALL Phone Interactive Flows ---
cmd('proto.flow.add', { start: mOnboard[0].fId, name: 'Phone App Walkthrough (Start at Video)' });
cmd('proto.flow.add', { start: m02A.fId, name: 'Phone Menu Home' });

mOnboard.forEach((cur, i) => {
  const next = mOnboard[(i + 1) % mOnboard.length];
  const prev = mOnboard[(i - 1 + mOnboard.length) % mOnboard.length];
  clickNav(cur.nextArrow, next.fId, { type: 'smartAnimate', durationMs: 520 });
  clickNav(cur.prevArrow, prev.fId, { type: 'smartAnimate', durationMs: 520 });
  dragNav(cur.fId, next.fId, { durationMs: 520 });
  keyNav(cur.fId, 'Right', next.fId, { type: 'smartAnimate' });
  keyNav(cur.fId, 'Left', prev.fId, { type: 'smartAnimate' });
  clickNav(cur.orderBtn, m02A.fId, { type: 'push', direction: 'left', durationMs: 480 });
  bindLangToggle(cur.langBtn, 'AR');
  cur.dots.forEach((dotId, di) => clickNav(dotId, mOnboard[di].fId, { type: 'smartAnimate', durationMs: 520 }));
});

const mobileMenus = [m02A, m02B, m02C, m02F];
// Menu 02A <-> 02B <-> 02C Smart Animate carousel (preserving vertical scroll)
clickNav(m02A.nextBtn, m02B.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(m02A.prevBtn, m02C.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(m02B.nextBtn, m02C.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(m02B.prevBtn, m02A.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(m02C.nextBtn, m02A.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(m02C.prevBtn, m02B.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });

mobileMenus.forEach((mm) => {
  clickNav(mm.idxBtns[0], m02A.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
  clickNav(mm.idxBtns[1], m02B.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
  clickNav(mm.idxBtns[2], m02C.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });

  clickNav(mm.pillAll, m02A.fId, { type: 'smartAnimate', durationMs: 360, preserveScroll: true });
  clickNav(mm.pillPist, m02F.fId, { type: 'smartAnimate', durationMs: 360, preserveScroll: true });

  clickNav(mm.fixedUi.logoBtn, mOnboard[0].fId, { type: 'dissolve', durationMs: 420 });
  bindLangToggle(mm.fixedUi.langBtn, 'AR');
  clickNav(mm.fixedUi.cartBtn, m05A.fId, { type: 'push', direction: 'left' });
  clickNav(mm.fixedUi.bottomCartBtn, m05A.fId, { type: 'push', direction: 'left' });
  overlayNav(mm.fixedUi.menuBtn, mDrawerOverlay, { position: 'topRight', direction: 'left' });

  mm.featCards.forEach(({ cf, target }) => clickNav(cf, target === 'bar' ? m04C.fId : m04A.fId, { type: 'push', direction: 'left' }));
  mm.reelCards.forEach(({ rc, target }) => clickNav(rc, target === 'bar' ? m04C.fId : m04A.fId, { type: 'push', direction: 'left' }));
  mm.filterProdCards.forEach(({ cf, target }) => clickNav(cf, target === 'bar' ? m04C.fId : m04A.fId, { type: 'push', direction: 'left' }));
  mm.catCards.forEach(({ card, dest }) => {
    if (dest === 'gift_modal') overlayNav(card, mGiftModal, { position: 'center', direction: 'bottom' });
    else if (dest === 'cat_choco') clickNav(card, m03B.fId, { type: 'push', direction: 'left' });
    else clickNav(card, m03A.fId, { type: 'push', direction: 'left' });
  });
});

// Wire Drawer Overlay buttons
closeOverlayNav(drawerCloseBtn);
clickNav(drawerRows[0], m02A.fId, { type: 'dissolve', durationMs: 320 });
overlayNav(drawerRows[1], mGiftModal, { position: 'center', direction: 'bottom' });
clickNav(drawerRows[2], m05A.fId, { type: 'push', direction: 'left' });
clickNav(drawerRows[3], m06, { type: 'push', direction: 'left' });
clickNav(drawerRows[4], m02A.fId, { type: 'dissolve', durationMs: 320 });

// Wire Gift Box Modal Overlay
closeOverlayNav(giftCloseBtn);
clickNav(giftAddBtn, m05A.fId, { type: 'push', direction: 'left' });

// Wire Categories 03A <-> 03B
[m03A, m03B].forEach((cat) => {
  clickNav(cat.fixedUi.logoBtn, mOnboard[0].fId, { type: 'dissolve' });
  clickNav(cat.fixedUi.cartBtn, m05A.fId, { type: 'push', direction: 'left' });
  clickNav(cat.fixedUi.bottomCartBtn, m05A.fId, { type: 'push', direction: 'left' });
  overlayNav(cat.fixedUi.menuBtn, mDrawerOverlay, { position: 'topRight', direction: 'left' });
  clickNav(cat.backBtn, m02A.fId, { type: 'push', direction: 'right' });
  clickNav(cat.pillCrepes, m03A.fId, { type: 'smartAnimate', durationMs: 360 });
  clickNav(cat.pillChoco, m03B.fId, { type: 'smartAnimate', durationMs: 360 });
  cat.prodCards.forEach(({ pc, target }) => clickNav(pc, target === 'bar' ? m04C.fId : m04A.fId, { type: 'push', direction: 'left' }));
});

// Wire Product Pages 04A <-> 04B and 04C
[m04A, m04B, m04C].forEach((pr, idx) => {
  clickNav(pr.fixedUi.logoBtn, mOnboard[0].fId, { type: 'dissolve' });
  clickNav(pr.fixedUi.cartBtn, m05A.fId, { type: 'push', direction: 'left' });
  overlayNav(pr.fixedUi.menuBtn, mDrawerOverlay, { position: 'topRight', direction: 'left' });
  clickNav(pr.backBtn, idx === 2 ? m03B.fId : m03A.fId, { type: 'push', direction: 'right' });
  clickNav(pr.addBtn, m05A.fId, { type: 'push', direction: 'left' });
});
clickNav(m04A.chip2, m04B.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });
clickNav(m04A.extra1, m04B.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });
clickNav(m04B.chip1, m04A.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });
clickNav(m04B.extra1, m04A.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });

// Wire Cart 05A <-> 05B and Confirmed 06
[m05A, m05B].forEach((cp) => {
  clickNav(cp.fixedUi.logoBtn, mOnboard[0].fId, { type: 'dissolve' });
  overlayNav(cp.fixedUi.menuBtn, mDrawerOverlay, { position: 'topRight', direction: 'left' });
  clickNav(cp.backBtn, m02A.fId, { type: 'push', direction: 'right' });
  clickNav(cp.pickupHit, m05A.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });
  clickNav(cp.deliveryHit, m05B.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });
  clickNav(cp.submitBtn, m06, { type: 'smartAnimate', durationMs: 420 });
});

clickNav(m06Hdr.logoBtn, mOnboard[0].fId, { type: 'dissolve' });
overlayNav(m06Hdr.menuBtn, mDrawerOverlay, { position: 'topRight', direction: 'left' });
clickNav(m06BackBtn, m02A.fId, { type: 'push', direction: 'right' });


// ============================================================================
// PAGE 2: LAPTOP INTERACTIVE WEB (MacBook Air — 1280 × 832)
// ============================================================================
addPage('02 · Laptop Interactive Web (MacBook Air)');
cmd('proto.settings', { device: 'MacBook Air', background: '#140702' });

const LW = 1280;
const LH = 832;
const lPos = (idx) => ({
  x: (idx % 4) * (LW + 120),
  y: Math.floor(idx / 4) * (LH + 140),
});

function addFixedDesktopHeader(screenId, { activeNav = 'menu' } = {}) {
  const hdr = frame({
    name: 'Fixed Desktop Header',
    parent: screenId,
    x: 0,
    y: 0,
    width: LW,
    height: 76,
    fill: CREAM,
    scrollPosition: 'fixed',
  });
  rect({ name: 'DHdr Line', parent: hdr, x: 0, y: 75, width: LW, height: 1, fill: BORDER_LINE });

  const brandBtn = frame({ name: 'DHdr Brand Hitbox', parent: hdr, x: 48, y: 18, width: 170, height: 40, fill: CREAM });
  addInlineLogo(brandBtn, { x: 0, y: 4, markHeight: 32, wordHeight: 18, color: COCOA });

  const menuLink = frame({ name: 'DNav Menu', parent: hdr, x: 640, y: 20, width: 78, height: 36, fill: activeNav === 'menu' ? CREAM_CARD : CREAM, radius: 999 });
  text({ name: 'DNav Menu T', parent: menuLink, x: 0, y: 9, width: 78, value: 'Menu', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: COCOA });

  const giftLink = frame({ name: 'DNav Gift Boxes', parent: hdr, x: 726, y: 20, width: 108, height: 36, fill: CREAM, radius: 999 });
  text({ name: 'DNav Gift T', parent: giftLink, x: 0, y: 9, width: 108, value: 'Gift Boxes', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: COCOA_SOFT });

  const studioBtn = frame({ name: 'DNav 3D Studio', parent: hdr, x: 842, y: 20, width: 164, height: 36, fill: activeNav === 'studio' ? CREAM_CARD : CREAM, radius: 999 });
  text({ name: 'DNav Studio T', parent: studioBtn, x: 0, y: 9, width: 164, value: '3D Cake Studio  ↗', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: COCOA });

  const langBtn = frame({ name: 'DHdr Lang Hitbox', parent: hdr, x: 1018, y: 20, width: 64, height: 36, fill: CREAM, radius: 999 });
  const langTxt = text({ name: 'DHdr Lang T', parent: langBtn, x: 0, y: 9, width: 64, value: 'عربي', fontFamily: 'Noto Sans Arabic', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: COCOA_SOFT });
  bindVar(langTxt, 'i18n_lang_btn');

  const cartBtn = frame({ name: 'DHdr Cart Hitbox', parent: hdr, x: 1094, y: 18, width: 138, height: 40, fill: COCOA, radius: 999 });
  text({ name: 'DHdr Cart T', parent: cartBtn, x: 0, y: 11, width: 138, value: 'View Cart (1)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: CREAM });

  return { hdr, brandBtn, menuLink, giftLink, studioBtn, langBtn, cartBtn };
}

// Desktop Onboarding L01A, L01B, L01C
const dOnboardMedia = [
  { name: 'L01A · Laptop Onboarding — Video 1', img: IMG('reel-dubai-crepe.jpg') },
  { name: 'L01B · Laptop Onboarding — Video 2', img: IMG('reel-cinnamon-rolls.jpg') },
  { name: 'L01C · Laptop Onboarding — Video 3', img: IMG('reel-strawberry-crepe.jpg') },
];

const dOnboard = dOnboardMedia.map((om, si) => {
  const pos = lPos(si);
  const fId = frame({ name: om.name, x: pos.x, y: pos.y, width: LW, height: LH, fill: ESPRESSO, clip: true });
  const track = frame({ name: 'D Onboard Track', parent: fId, x: -si * LW, y: 0, width: LW * 3, height: LH, fill: ESPRESSO, clip: false });
  dOnboardMedia.forEach((m, mi) => {
    imageBox({ name: `D Video ${mi + 1}`, parent: track, x: mi * LW, y: 0, width: LW, height: LH, file: m.img, radius: 0 });
  });
  gradientRect({ name: 'D Onboard Scrim', parent: fId, x: 0, y: 0, width: LW, height: LH, stops: ['#140702AA', '#14070244', '#140702CC'] });

  const langBtn = frame({ name: 'D Onboard Lang', parent: fId, x: LW - 110, y: 28, width: 64, height: 34, fill: '#00000000' });
  const lTxt = text({ name: 'D Onboard Lang Txt', parent: langBtn, x: 0, y: 6, width: 64, value: 'عربي', fontFamily: 'Noto Sans Arabic', fontStyle: 'Bold', fontSize: 16, textAlign: 'right', fill: CREAM });
  bindVar(lTxt, 'i18n_lang_btn');

  const prevArrow = frame({ name: 'D Onboard Prev', parent: fId, x: 24, y: 376, width: 56, height: 80, fill: '#00000000' });
  text({ name: 'D Onboard Prev G', parent: prevArrow, x: 0, y: 20, width: 56, value: '←', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 32, textAlign: 'center', fill: CREAM });

  const nextArrow = frame({ name: 'D Onboard Next', parent: fId, x: LW - 80, y: 376, width: 56, height: 80, fill: '#00000000' });
  text({ name: 'D Onboard Next G', parent: nextArrow, x: 0, y: 20, width: 56, value: '→', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 32, textAlign: 'center', fill: CREAM });

  addInlineLogo(fId, { x: LW / 2, y: 262, markHeight: 78, wordHeight: 34, color: CREAM, stacked: true });

  const orderBtn = frame({ name: 'D Onboard OrderBtn', parent: fId, x: 520, y: 422, width: 240, height: 54, fill: CREAM, radius: 999 });
  shadow(orderBtn, { color: '#00000066', offset: [0, 14], radius: 30, spread: -4 });
  const oTxt = text({ name: 'D Onboard OrderTxt', parent: orderBtn, x: 0, y: 17, width: 240, value: 'ORDER NOW  →', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, letterSpacing: '10%', textAlign: 'center', fill: COCOA });
  bindVar(oTxt, 'i18n_order_now');

  const dotXs = [604, 634, 664];
  dotXs.forEach((dx, di) => {
    const active = di === si;
    rect({ name: `D Dot ${di + 1}`, parent: fId, x: active ? dx - 6 : dx, y: 766, width: active ? 26 : 10, height: 6, fill: active ? GOLD : CREAM, opacity: active ? 1 : 0.4, radius: 999 });
  });

  return { fId, prevArrow, nextArrow, orderBtn, langBtn };
});

// Desktop Menu Home (L02A, L02B, L02C carousel states + L02F Filtered Pistachio)
function buildDesktopMenuHome(idx, { slideIndex = 0, filteredPistachio = false } = {}) {
  const pos = lPos(idx);
  const fName = filteredPistachio
    ? 'L02F · Laptop Menu — Filtered Pistachio'
    : `L02${['A', 'B', 'C'][slideIndex]} · Laptop Menu — Slide 0${slideIndex + 1} (Scrollable)`;
  const fId = frame({ name: fName, x: pos.x, y: pos.y, width: LW, height: LH, fill: CREAM, overflow: 'vertical' });

  const fT = text({ name: 'D Featured Title', parent: fId, x: 48, y: 146, value: 'Featured', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 66, fill: COCOA });
  bindVar(fT, 'i18n_featured');
  const fS = text({ name: 'D Featured Sub', parent: fId, x: 48, y: 232, width: 340, value: 'Discover our signature handcrafted chocolates, warm crepes, and seasonal specials.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 16, lineHeight: 26, fill: COCOA_SOFT });
  bindVar(fS, 'i18n_featured_sub');

  const prevBtn = frame({ name: 'D Slider Prev', parent: fId, x: 430, y: 120, width: 38, height: 34, fill: CREAM });
  text({ name: 'D Slider Prev T', parent: prevBtn, x: 0, y: 6, width: 38, value: '←', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 18, textAlign: 'center', fill: COCOA });

  const idxBtns = [0, 1, 2].map((ii) => {
    const active = ii === slideIndex;
    const b = frame({ name: `D Slider 0${ii + 1}`, parent: fId, x: 474 + ii * 48, y: 120, width: 42, height: 34, fill: active ? CREAM_CARD : CREAM, radius: 6 });
    text({ name: `D Slider 0${ii + 1} T`, parent: b, x: 0, y: 7, width: 42, value: `0${ii + 1}`, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'center', fill: active ? COCOA : MUTED });
    return b;
  });

  const nextBtn = frame({ name: 'D Slider Next', parent: fId, x: 622, y: 120, width: 38, height: 34, fill: CREAM });
  text({ name: 'D Slider Next T', parent: nextBtn, x: 0, y: 6, width: 38, value: '→', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 18, textAlign: 'center', fill: COCOA });

  const viewport = frame({ name: 'D Featured Viewport Scroll', parent: fId, x: 430, y: 170, width: 850, height: 326, fill: CREAM, clip: true, overflow: 'horizontal' });
  const track = frame({ name: 'D Featured Track', parent: viewport, x: -slideIndex * 274, y: 0, width: 1680, height: 326, fill: CREAM, clip: false });

  const featData = [
    { name: 'Dubai Kunafa Chocolate Crepe', price: '$9.50', img: IMG('reel-dubai-crepe.jpg'), target: 'crepe' },
    { name: 'Warm Frosted Cinnamon Rolls', price: '$5.50', img: IMG('reel-cinnamon-rolls.jpg'), target: 'crepe' },
    { name: 'Pistachio Belgian Waffle', price: '$9.00', img: IMG('menu-pistachio-waffle.jpg'), target: 'bar' },
    { name: 'London Chocolate Cake', price: '$28.00', img: IMG('reel-london-cake.jpg'), target: 'bar' },
    { name: 'Golden Kunafa Cookie', price: '$7.50', img: IMG('reel-kunafa-cookie.jpg'), target: 'bar' },
    { name: 'Pistachio Kunafa Bar', price: '$14.00', img: IMG('ig-kunafa-cookie-drip.jpg'), target: 'bar' },
  ];
  const featCards = [];
  featData.forEach((fd, i) => {
    const cf = frame({ name: `D Feat Card ${i + 1}`, parent: track, x: i * 274, y: 0, width: 254, height: 320, fill: CREAM });
    imageBox({ name: `D Feat Img ${i + 1}`, parent: cf, x: 0, y: 0, width: 254, height: 254, file: fd.img, radius: 10, withShadow: true });
    text({ name: `D Feat Title ${i + 1}`, parent: cf, x: 0, y: 266, width: 194, value: fd.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 17, fill: COCOA });
    text({ name: `D Feat Price ${i + 1}`, parent: cf, x: 196, y: 268, width: 58, value: fd.price, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'right', fill: COCOA_SOFT });
    featCards.push({ cf, target: fd.target });
  });

  // Search + Interactive Filter Bar
  rect({ name: 'D Toolbar Rule', parent: fId, x: 48, y: 520, width: 1184, height: 1, fill: BORDER_LINE });
  const dSearch = text({ name: 'D Search Mock', parent: fId, x: 48, y: 544, value: '⌕   Search menu…', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 16, fill: MUTED });
  bindVar(dSearch, 'i18n_search');
  rect({ name: 'D Search Underline', parent: fId, x: 48, y: 576, width: 420, height: 1, fill: COCOA });

  const pillAll = frame({ name: 'D Filter All', parent: fId, x: 520, y: 538, width: 56, height: 34, fill: filteredPistachio ? CREAM : CREAM_CARD, radius: 6 });
  text({ name: 'D Filter All T', parent: pillAll, x: 0, y: 8, width: 56, value: 'All', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: COCOA });

  text({ name: 'D Filter Pop T', parent: fId, x: 594, y: 546, value: 'Popular', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: COCOA_SOFT });

  const pillPist = frame({ name: 'D Filter Pistachio', parent: fId, x: 676, y: 538, width: 92, height: 34, fill: filteredPistachio ? COCOA : CREAM, radius: 6 });
  text({ name: 'D Filter Pist T', parent: pillPist, x: 0, y: 8, width: 92, value: 'Pistachio', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: filteredPistachio ? CREAM : COCOA_SOFT });

  text({ name: 'D Filter Extra', parent: fId, x: 788, y: 546, value: 'Dark Chocolate          Under $10', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: COCOA_SOFT });

  const catCards = [];
  const filtCards = [];
  if (filteredPistachio) {
    text({ name: 'D Filt Title', parent: fId, x: 48, y: 616, value: 'Showing 4 Pistachio Creations', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 34, fill: COCOA });
    const fItems = [
      { name: 'Dubai Kunafa Crepe', price: '$9.50', img: IMG('reel-dubai-crepe.jpg'), target: 'crepe' },
      { name: 'Pistachio Kunafa Bar', price: '$14.00', img: IMG('ig-kunafa-cookie-drip.jpg'), target: 'bar' },
      { name: 'Pistachio Belgian Waffle', price: '$9.00', img: IMG('menu-pistachio-waffle.jpg'), target: 'bar' },
      { name: 'Golden Kunafa Cookie', price: '$7.50', img: IMG('reel-kunafa-cookie.jpg'), target: 'bar' },
    ];
    fItems.forEach((fi, i) => {
      const fx = 48 + i * 302;
      const fc = frame({ name: `D Filt Card ${i}`, parent: fId, x: fx, y: 674, width: 280, height: 310, fill: CREAM });
      text({ name: `D Filt Name ${i}`, parent: fc, x: 0, y: 0, width: 204, value: fi.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 18, lineHeight: 23, fill: COCOA });
      text({ name: `D Filt Price ${i}`, parent: fc, x: 214, y: 2, width: 66, value: fi.price, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'right', fill: COCOA_SOFT });
      imageBox({ name: `D Filt Img ${i}`, parent: fc, x: 0, y: 58, width: 280, height: 236, file: fi.img, radius: 10, withShadow: true });
      filtCards.push({ cf: fc, target: fi.target });
    });
  } else {
    const cHead = text({ name: 'D Cat Heading', parent: fId, x: 48, y: 616, value: 'Categories', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 34, fill: COCOA });
    bindVar(cHead, 'i18n_categories');
    const cats = [
      { name: 'Crepes & Waffles', img: IMG('reel-strawberry-crepe.jpg'), dest: 'cat_crepes' },
      { name: 'Chocolates & Bark', img: IMG('ig-kunafa-cookie-drip.jpg'), dest: 'cat_choco' },
      { name: 'Signature Gateaux', img: IMG('reel-london-cake.jpg'), dest: 'cat_choco' },
      { name: 'Savory Flurry & Shakes', img: IMG('menu-icecream-cup.jpg'), dest: 'cat_crepes' },
      { name: 'Cakes by the slice', img: IMG('cake-moms-slice.jpg'), dest: 'cat_choco' },
      { name: 'Bakes & Cookies', img: IMG('reel-kunafa-cookie.jpg'), dest: 'cat_crepes' },
      { name: 'Drinks & Espresso', img: IMG('menu-dessert-cups.jpg'), dest: 'cat_choco' },
      { name: 'Luxury Gift Boxes', img: IMG('gift-eid-box.jpg'), dest: 'gift_modal' },
    ];
    cats.forEach((ct, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const kx = 48 + col * 302;
      const ky = 674 + row * 246;
      const cCard = frame({ name: `D Cat Card ${ct.name}`, parent: fId, x: kx, y: ky, width: 280, height: 226, fill: CREAM });
      text({ name: `D Cat Title ${i}`, parent: cCard, x: 0, y: 0, width: 280, value: ct.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 20, fill: COCOA });
      imageBox({ name: `D Cat Img ${i}`, parent: cCard, x: 0, y: 34, width: 280, height: 184, file: ct.img, radius: 10, withShadow: true });
      catCards.push({ card: cCard, dest: ct.dest });
    });
  }

  // Horizontal Reels Strip below Categories (scrollable side to side!)
  const dReelsY = filteredPistachio ? 1000 : 1184;
  const dReelsHead = text({ name: 'D Reels Title', parent: fId, x: 48, y: dReelsY, value: '@savory.chocolate Reels', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 32, fill: COCOA });
  bindVar(dReelsHead, 'i18n_reels');

  const reelsStrip = frame({ name: 'D Reels Scroll Strip', parent: fId, x: 48, y: dReelsY + 52, width: 1232, height: 356, fill: CREAM, clip: true, overflow: 'horizontal' });
  const reelsData = [
    { name: 'Dubai Crepe', views: '▶ 184K', img: IMG('reel-dubai-crepe.jpg'), target: 'crepe' },
    { name: 'Cinnamon Rolls', views: '▶ 96K', img: IMG('reel-cinnamon-rolls.jpg'), target: 'crepe' },
    { name: 'Kunafa Cookie', views: '▶ 142K', img: IMG('reel-kunafa-cookie.jpg'), target: 'bar' },
    { name: 'London Cake', views: '▶ 210K', img: IMG('reel-london-cake.jpg'), target: 'bar' },
    { name: 'Strawberry Crepe', views: '▶ 88K', img: IMG('reel-strawberry-crepe.jpg'), target: 'crepe' },
    { name: 'Pancake Stack', views: '▶ 74K', img: IMG('reel-pancakes.jpg'), target: 'crepe' },
  ];
  const reelCards = [];
  reelsData.forEach((rl, i) => {
    const rc = frame({ name: `D Reel Card ${i}`, parent: reelsStrip, x: i * 240, y: 0, width: 222, height: 346, fill: CREAM });
    imageBox({ name: `D Reel Img ${i}`, parent: rc, x: 0, y: 0, width: 222, height: 304, file: rl.img, radius: 10 });
    rect({ name: `D Reel Badge BG ${i}`, parent: rc, x: 12, y: 12, width: 70, height: 24, fill: ESPRESSO, opacity: 0.78, radius: 999 });
    text({ name: `D Reel Badge T ${i}`, parent: rc, x: 12, y: 18, width: 70, value: rl.views, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 11, textAlign: 'center', fill: CREAM });
    circle({ name: `D Reel Play C ${i}`, parent: rc, x: 89, y: 130, size: 44, fill: CREAM, opacity: 0.92 });
    text({ name: `D Reel Play T ${i}`, parent: rc, x: 89, y: 142, width: 44, value: '▶', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: COCOA });
    text({ name: `D Reel Name ${i}`, parent: rc, x: 0, y: 316, value: rl.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 17, fill: COCOA });
    reelCards.push({ rc, target: rl.target });
  });

  rect({ name: 'D Branches Line', parent: fId, x: 48, y: dReelsY + 436, width: 1184, height: 1, fill: BORDER_LINE });
  text({ name: 'D Branches T', parent: fId, x: 48, y: dReelsY + 462, value: 'Visit Our Branches  ·  Open Daily 10:00 AM – 11:30 PM', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 26, fill: COCOA });
  text({ name: 'D Branches Copy', parent: fId, x: 48, y: dReelsY + 502, value: 'Aramoun Main Road  ·  Aley Khoury Center  ·  Pay on pickup or delivery', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 15, fill: COCOA_SOFT });
  rect({ name: 'D Menu Pad', parent: fId, x: 0, y: dReelsY + 540, width: 10, height: 50, fill: CREAM, opacity: 0.01 });

  const fixedHdr = addFixedDesktopHeader(fId, { activeNav: 'menu' });
  return { fId, fixedHdr, prevBtn, idxBtns, nextBtn, viewport, pillAll, pillPist, featCards, catCards, filtCards, reelCards };
}

const l02A = buildDesktopMenuHome(3, { slideIndex: 0 });
const l02B = buildDesktopMenuHome(4, { slideIndex: 1 });
const l02C = buildDesktopMenuHome(5, { slideIndex: 2 });
const l02F = buildDesktopMenuHome(6, { slideIndex: 0, filteredPistachio: true });

// Desktop Category Page L03
const l03Pos = lPos(7);
const l03 = frame({ name: 'L03 · Laptop Category — Crepes & Waffles', x: l03Pos.x, y: l03Pos.y, width: LW, height: LH, fill: CREAM, overflow: 'vertical' });
const l03Back = frame({ name: 'D Cat Back Hitbox', parent: l03, x: 48, y: 102, width: 170, height: 32, fill: CREAM });
text({ name: 'D Cat Back Txt', parent: l03Back, x: 0, y: 6, value: '←  All Categories', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, fill: COCOA_SOFT });
text({ name: 'D Cat Title', parent: l03, x: 48, y: 146, value: 'Crepes & Waffles', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 52, fill: COCOA });

const lCatProds = [
  { name: 'Dubai Kunafa Chocolate Crepe', price: '$9.50', img: IMG('reel-dubai-crepe.jpg') },
  { name: 'Strawberry Nutella Crepe', price: '$8.50', img: IMG('reel-strawberry-crepe.jpg') },
  { name: 'Pistachio Belgian Waffle', price: '$9.00', img: IMG('menu-pistachio-waffle.jpg') },
  { name: 'Warm Frosted Cinnamon Rolls', price: '$5.50', img: IMG('reel-cinnamon-rolls.jpg') },
  { name: 'Golden Kunafa Cookie', price: '$7.50', img: IMG('reel-kunafa-cookie.jpg') },
  { name: 'Belgian Pancake Stack', price: '$8.00', img: IMG('reel-pancakes.jpg') },
  { name: 'Chocolate Dessert Cups', price: '$6.50', img: IMG('menu-dessert-cups.jpg') },
  { name: 'Kunafa Eclair Quartet', price: '$11.00', img: IMG('ig-kunafa-eclair.jpg') },
];
const l03Cards = lCatProds.map((pr, i) => {
  const col = i % 4;
  const row = Math.floor(i / 4);
  const c = frame({ name: `D Cat Prod ${i}`, parent: l03, x: 48 + col * 302, y: 236 + row * 356, width: 280, height: 336, fill: CREAM });
  text({ name: `D Cat P Title ${i}`, parent: c, x: 0, y: 0, width: 204, value: pr.name, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 18, lineHeight: 23, fill: COCOA });
  text({ name: `D Cat P Price ${i}`, parent: c, x: 214, y: 2, width: 66, value: pr.price, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'right', fill: COCOA_SOFT });
  imageBox({ name: `D Cat P Img ${i}`, parent: c, x: 0, y: 58, width: 280, height: 266, file: pr.img, radius: 10, withShadow: true });
  return c;
});
rect({ name: 'D Cat Pad', parent: l03, x: 0, y: 950, width: 10, height: 40, fill: CREAM, opacity: 0.01 });
const l03Hdr = addFixedDesktopHeader(l03, { activeNav: 'menu' });

// Desktop Product Page L04A (Default $9.50) <-> L04B (Customized $12.00) with Smart Animate!
function buildDesktopProductPage(idx, customized) {
  const pos = lPos(idx);
  const fId = frame({ name: customized ? 'L04B · Laptop Product — Customized ($12.00)' : 'L04A · Laptop Product — Default ($9.50)', x: pos.x, y: pos.y, width: LW, height: LH, fill: CREAM, overflow: 'vertical' });
  const backBtn = frame({ name: 'D Prod Back', parent: fId, x: 48, y: 102, width: 190, height: 32, fill: CREAM });
  text({ name: 'D Prod Back T', parent: backBtn, x: 0, y: 6, value: '←  Crepes & Waffles', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, fill: COCOA_SOFT });

  imageBox({ name: 'D Prod Photo', parent: fId, x: 48, y: 152, width: 520, height: 520, file: IMG('reel-dubai-crepe.jpg'), radius: 12, withShadow: true });
  text({ name: 'D Prod Title', parent: fId, x: 616, y: 150, width: 492, value: 'Dubai Kunafa Chocolate Crepe', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 36, lineHeight: 42, fill: COCOA });
  text({ name: 'D Prod Price', parent: fId, x: 1120, y: 156, width: 112, value: customized ? '$12.00' : '$9.50', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 28, textAlign: 'right', fill: COCOA });
  rect({ name: 'D Prod Rule', parent: fId, x: 616, y: 248, width: 616, height: 1, fill: BORDER_LINE });
  text({ name: 'D Prod Desc', parent: fId, x: 616, y: 268, width: 616, value: 'Hand-rolled warm crepe filled with crispy roasted kataifi pastry and Lebanese pistachio cream, drenched in Belgian milk, dark and white chocolate ribbons.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 16, lineHeight: 26, fill: COCOA_SOFT });

  text({ name: 'D Opt 1', parent: fId, x: 616, y: 352, value: 'DRIZZLE STYLE', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, letterSpacing: '8%', fill: COCOA });
  const chip1 = frame({ name: 'D Chip 1', parent: fId, x: 616, y: 382, width: 256, height: 42, fill: customized ? CREAM_CARD : COCOA, radius: 8 });
  text({ name: 'D Chip 1 T', parent: chip1, x: 0, y: 12, width: 256, value: 'Triple Chocolate & Pistachio', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: customized ? COCOA : CREAM });

  const chip2 = frame({ name: 'D Chip 2', parent: fId, x: 884, y: 382, width: 264, height: 42, fill: customized ? COCOA : CREAM_CARD, radius: 8 });
  text({ name: 'D Chip 2 T', parent: chip2, x: 0, y: 12, width: 264, value: 'Dark 70% & Pistachio (+$0.50)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, textAlign: 'center', fill: customized ? CREAM : COCOA });

  text({ name: 'D Opt 2', parent: fId, x: 616, y: 452, value: 'EXTRAS', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, letterSpacing: '8%', fill: COCOA });
  const extra1 = frame({ name: 'D Extra 1 Hitbox', parent: fId, x: 616, y: 480, width: 616, height: 42, fill: CREAM });
  text({ name: 'D Extra 1 T', parent: extra1, x: 0, y: 10, value: customized ? '☑   Extra pistachio kunafa crunch' : '☐   Extra pistachio kunafa crunch', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, fill: COCOA });
  text({ name: 'D Extra 1 P', parent: extra1, x: 504, y: 10, width: 112, value: '+$2.00', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'right', fill: COCOA_SOFT });
  rect({ name: 'D Extra 1 Rule', parent: extra1, x: 0, y: 41, width: 616, height: 1, fill: BORDER_LINE });

  text({ name: 'D Extra 2', parent: fId, x: 616, y: 534, value: '☐   Fresh strawberries', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 15, fill: COCOA });
  text({ name: 'D Extra 2 P', parent: fId, x: 1120, y: 534, width: 112, value: '+$1.50', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'right', fill: COCOA_SOFT });

  text({ name: 'D Req Lbl', parent: fId, x: 616, y: 590, value: 'SPECIAL REQUESTS', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, letterSpacing: '8%', fill: COCOA });
  text({ name: 'D Req Hint', parent: fId, x: 616, y: 620, value: 'Allergies, packaging notes, or special requests…', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 15, fill: MUTED });
  rect({ name: 'D Req Rule', parent: fId, x: 616, y: 652, width: 616, height: 1, fill: COCOA });

  rect({ name: 'D Prod Qty', parent: fId, x: 616, y: 682, width: 124, height: 52, fill: CREAM_CARD, radius: 8 });
  text({ name: 'D Prod Qty T', parent: fId, x: 616, y: 698, width: 124, value: '−   1   +', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 18, textAlign: 'center', fill: COCOA });

  const addBtn = frame({ name: 'D Prod Add CTA', parent: fId, x: 756, y: 682, width: 476, height: 52, fill: COCOA, radius: 8 });
  text({ name: 'D Prod Add T', parent: addBtn, x: 0, y: 16, width: 476, value: customized ? 'Add to Order  ·  $12.00' : 'Add to Order  ·  $9.50', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'center', fill: CREAM });

  const hdr = addFixedDesktopHeader(fId, { activeNav: 'menu' });
  return { fId, hdr, backBtn, chip1, chip2, extra1, addBtn };
}

const l04A = buildDesktopProductPage(8, false);
const l04B = buildDesktopProductPage(9, true);

// Desktop Cart L05
const l05Pos = lPos(10);
const l05 = frame({ name: 'L05 · Laptop Cart & Checkout', x: l05Pos.x, y: l05Pos.y, width: LW, height: LH, fill: CREAM, overflow: 'vertical' });
const l05Back = frame({ name: 'D Cart Back', parent: l05, x: 48, y: 102, width: 190, height: 32, fill: CREAM });
text({ name: 'D Cart Back T', parent: l05Back, x: 0, y: 6, value: '←  Continue Shopping', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, fill: COCOA_SOFT });
const l05Head = text({ name: 'D Cart Title', parent: l05, x: 48, y: 146, value: 'Your Cart', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 48, fill: COCOA });
bindVar(l05Head, 'i18n_cart');

imageBox({ name: 'D Cart Item Img', parent: l05, x: 48, y: 230, width: 92, height: 92, file: IMG('reel-dubai-crepe.jpg'), radius: 10 });
text({ name: 'D Cart Item T', parent: l05, x: 160, y: 234, value: 'Dubai Kunafa Chocolate Crepe', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 22, fill: COCOA });
text({ name: 'D Cart Item Meta', parent: l05, x: 160, y: 266, value: 'Dark 70% & Pistachio · Extra pistachio crunch · Qty 1', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 14, fill: MUTED });
text({ name: 'D Cart Item Total', parent: l05, x: 560, y: 236, width: 100, value: '$12.00', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 20, textAlign: 'right', fill: COCOA });
rect({ name: 'D Cart Divider', parent: l05, x: 48, y: 348, width: 612, height: 1, fill: BORDER_LINE });

rect({ name: 'D Checkout Panel', parent: l05, x: 720, y: 152, width: 512, height: 596, fill: CREAM_SOFT, radius: 18 });
text({ name: 'D Checkout Title', parent: l05, x: 760, y: 192, value: 'Checkout Details', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 32, fill: COCOA });
rect({ name: 'D Checkout Line', parent: l05, x: 760, y: 248, width: 432, height: 1, fill: BORDER_LINE });
text({ name: 'D Checkout Total L', parent: l05, x: 760, y: 272, value: 'Total (Pay on pickup)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 24, fill: COCOA });
text({ name: 'D Checkout Total V', parent: l05, x: 1080, y: 272, width: 112, value: '$12.00', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 24, textAlign: 'right', fill: COCOA });
rect({ name: 'D Checkout F1', parent: l05, x: 760, y: 338, width: 432, height: 48, fill: CREAM, radius: 8 });
text({ name: 'D Checkout F1 T', parent: l05, x: 780, y: 353, value: 'Branch: SAVORY Aramoun  ·  Pickup Today 6:30 PM', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, fill: COCOA });
rect({ name: 'D Checkout F2', parent: l05, x: 760, y: 404, width: 432, height: 48, fill: CREAM, radius: 8 });
text({ name: 'D Checkout F2 T', parent: l05, x: 780, y: 419, value: 'Name: Nour Haddad   ·   +961 70 123 456', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 14, fill: COCOA });
rect({ name: 'D Checkout Submit', parent: l05, x: 760, y: 494, width: 432, height: 54, fill: COCOA, radius: 8 });
text({ name: 'D Checkout Submit T', parent: l05, x: 760, y: 511, width: 432, value: 'Place Order & Open WhatsApp  →', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'center', fill: CREAM });
const l05Hdr = addFixedDesktopHeader(l05, { activeNav: 'menu' });

// Desktop 3D Custom Cake Studio (L06A <-> L06B interactive states!)
function buildDesktopCakeStudio(idx, stateIdx) {
  const pos = lPos(idx);
  const fId = frame({ name: stateIdx === 0 ? 'L06A · Laptop 3D Studio — Dark Heart' : 'L06B · Laptop 3D Studio — Ribbon Tier', x: pos.x, y: pos.y, width: LW, height: LH, fill: ESPRESSO });

  imageBox({
    name: '3D Stage Photo',
    parent: fId,
    x: 48,
    y: 112,
    width: 640,
    height: 672,
    file: stateIdx === 0 ? IMG('cake-heart-chocolate.jpg') : IMG('cake-valentine-ribbons.jpg'),
    radius: 18,
  });
  rect({ name: '3D Stage Pill BG', parent: fId, x: 68, y: 132, width: 320, height: 32, fill: ESPRESSO, opacity: 0.88, radius: 999 });
  text({ name: '3D Stage Pill T', parent: fId, x: 68, y: 140, width: 320, value: '●   LIVE WEBGL 3D PREVIEW  ·  DRAG TO ORBIT', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 11, letterSpacing: '8%', textAlign: 'center', fill: GOLD });

  text({ name: '3D Kicker', parent: fId, x: 736, y: 118, value: 'SAVORY 3D CAKE STUDIO', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, letterSpacing: '12%', fill: GOLD });
  text({ name: '3D Title', parent: fId, x: 736, y: 152, width: 496, value: 'See Your Cake Before We Bake It', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 44, lineHeight: 50, fill: CREAM });

  // Interactive Shape / Preset Tabs
  const tabHeart = frame({ name: '3D Tab Heart', parent: fId, x: 736, y: 274, width: 240, height: 44, fill: stateIdx === 0 ? GOLD : ESPRESSO_CARD, radius: 10 });
  text({ name: '3D Tab Heart T', parent: tabHeart, x: 0, y: 13, width: 240, value: 'Dark Belgian Heart ($68)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: stateIdx === 0 ? ESPRESSO : CREAM });

  const tabRibbon = frame({ name: '3D Tab Ribbon', parent: fId, x: 992, y: 274, width: 240, height: 44, fill: stateIdx === 1 ? GOLD : ESPRESSO_CARD, radius: 10 });
  text({ name: '3D Tab Ribbon T', parent: tabRibbon, x: 0, y: 13, width: 240, value: 'Velvet Ribbon Cake ($82)', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, textAlign: 'center', fill: stateIdx === 1 ? ESPRESSO : CREAM });

  rect({ name: '3D Details Box', parent: fId, x: 736, y: 342, width: 496, height: 340, fill: ESPRESSO_CARD, radius: 16 });
  text({
    name: '3D Specs Text',
    parent: fId,
    x: 772,
    y: 374,
    width: 424,
    value: stateIdx === 0
      ? 'Shape: Heart Celebration Cake (8")\nSponge: Dark 70% Belgian Cocoa\nFilling: Roasted Pistachio Kunafa\nGlaze: Mirror Dark Ganache Drip\nFeature: Click "Cut a Slice" to preview layers'
      : 'Shape: Classic Tall Tier (9")\nSponge: Madagascar Vanilla Bean\nFilling: Strawberry Compote & Cream\nFinish: Hand-tied Silk Ribbons & Pearls\nFeature: Custom 3D Shareable Link',
    fontFamily: 'Cabin',
    fontStyle: 'Medium',
    fontSize: 16,
    lineHeight: 36,
    fill: CREAM,
  });

  const orderCakeBtn = frame({ name: '3D Place CakeBtn', parent: fId, x: 736, y: 706, width: 496, height: 54, fill: GOLD, radius: 999 });
  text({ name: '3D Place CakeTxt', parent: orderCakeBtn, x: 0, y: 17, width: 496, value: stateIdx === 0 ? 'Place Custom Cake Order  ·  $68.00  →' : 'Place Custom Cake Order  ·  $82.00  →', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, textAlign: 'center', fill: ESPRESSO });

  const hdr = addFixedDesktopHeader(fId, { activeNav: 'studio' });
  return { fId, hdr, tabHeart, tabRibbon, orderCakeBtn };
}

const l06A = buildDesktopCakeStudio(11, 0);
const l06B = buildDesktopCakeStudio(12, 1);

// Desktop Overlay: Luxury Gift Box Studio Modal (self-contained on Page 2!)
const dGiftPos = lPos(13);
const dGiftModal = frame({ name: 'OVERLAY · Desktop Luxury Gift Box Studio', x: dGiftPos.x, y: dGiftPos.y, width: 520, height: 640, fill: CREAM, radius: 24 });
shadow(dGiftModal, { color: '#14070277', offset: [0, 24], radius: 48, spread: 0 });
text({ name: 'DGift Eyebrow', parent: dGiftModal, x: 32, y: 28, value: 'SAVORY CHOCOLATIER', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 12, letterSpacing: '12%', fill: MUTED });
text({ name: 'DGift Title', parent: dGiftModal, x: 32, y: 50, value: 'Build Your Gift Box', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 34, fill: COCOA });
const dGiftClose = frame({ name: 'DGift Close', parent: dGiftModal, x: 454, y: 26, width: 38, height: 38, fill: CREAM_CARD, radius: 999 });
text({ name: 'DGift Close X', parent: dGiftClose, x: 0, y: 8, width: 38, value: '✕', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'center', fill: COCOA });

rect({ name: 'DSize 9', parent: dGiftModal, x: 32, y: 108, width: 144, height: 52, fill: COCOA, radius: 10 });
text({ name: 'DSize 9 T', parent: dGiftModal, x: 32, y: 118, width: 144, value: '9 Pieces\n$18.00 · 3×3', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, lineHeight: 17, textAlign: 'center', fill: CREAM });
rect({ name: 'DSize 16', parent: dGiftModal, x: 188, y: 108, width: 144, height: 52, fill: CREAM_CARD, radius: 10 });
text({ name: 'DSize 16 T', parent: dGiftModal, x: 188, y: 118, width: 144, value: '16 Pieces\n$30.00 · 4×4', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, lineHeight: 17, textAlign: 'center', fill: COCOA });
rect({ name: 'DSize 25', parent: dGiftModal, x: 344, y: 108, width: 144, height: 52, fill: CREAM_CARD, radius: 10 });
text({ name: 'DSize 25 T', parent: dGiftModal, x: 344, y: 118, width: 144, value: '25 Pieces\n$45.00 · 5×5', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 13, lineHeight: 17, textAlign: 'center', fill: COCOA });

rect({ name: 'DGift Tray', parent: dGiftModal, x: 135, y: 182, width: 250, height: 250, fill: ESPRESSO, radius: 16, stroke: GOLD, strokeWeight: 2 });
truffleColors.forEach((colHex, ti) => {
  const cCol = ti % 3;
  const cRow = Math.floor(ti / 3);
  circle({ name: `D Truffle ${ti + 1}`, parent: dGiftModal, x: 165 + cCol * 68, y: 212 + cRow * 68, size: 54, fill: colHex, stroke: '#D9B06666', strokeWeight: 1.5 });
});
text({ name: 'DGift Summary', parent: dGiftModal, x: 32, y: 454, width: 456, value: '✦  9 / 9 Artisan Truffles Selected\nPistachio Kunafa, Dark 70%, Salted Caramel & Hazelnut Praline', fontFamily: 'Cabin', fontStyle: 'Medium', fontSize: 14, lineHeight: 22, textAlign: 'center', fill: COCOA_SOFT });
const dGiftAdd = frame({ name: 'DGift Add', parent: dGiftModal, x: 32, y: 556, width: 456, height: 54, fill: COCOA, radius: 10 });
text({ name: 'DGift Add T', parent: dGiftAdd, x: 0, y: 17, width: 456, value: 'Add 9-Piece Gift Box  ·  $18.00  →', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'center', fill: CREAM });
closeOverlayNav(dGiftClose);
clickNav(dGiftAdd, l05, { type: 'push', direction: 'left' });

// Wire ALL Laptop Interactive Flows
cmd('proto.flow.add', { start: dOnboard[0].fId, name: 'Laptop Website Walkthrough (Start at Onboarding)' });
cmd('proto.flow.add', { start: l02A.fId, name: 'Laptop Menu Home' });

dOnboard.forEach((cur, i) => {
  const next = dOnboard[(i + 1) % dOnboard.length];
  const prev = dOnboard[(i - 1 + dOnboard.length) % dOnboard.length];
  clickNav(cur.nextArrow, next.fId, { type: 'smartAnimate', durationMs: 520 });
  clickNav(cur.prevArrow, prev.fId, { type: 'smartAnimate', durationMs: 520 });
  dragNav(cur.fId, next.fId, { durationMs: 520 });
  keyNav(cur.fId, 'Right', next.fId, { type: 'smartAnimate' });
  keyNav(cur.fId, 'Left', prev.fId, { type: 'smartAnimate' });
  clickNav(cur.orderBtn, l02A.fId, { type: 'push', direction: 'left', durationMs: 480 });
  bindLangToggle(cur.langBtn, 'AR');
});

clickNav(l02A.nextBtn, l02B.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(l02A.prevBtn, l02C.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(l02B.nextBtn, l02C.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(l02B.prevBtn, l02A.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(l02C.nextBtn, l02A.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
clickNav(l02C.prevBtn, l02B.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });

[l02A, l02B, l02C, l02F].forEach((dm) => {
  clickNav(dm.idxBtns[0], l02A.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
  clickNav(dm.idxBtns[1], l02B.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });
  clickNav(dm.idxBtns[2], l02C.fId, { type: 'smartAnimate', durationMs: 460, preserveScroll: true });

  clickNav(dm.pillAll, l02A.fId, { type: 'smartAnimate', durationMs: 360, preserveScroll: true });
  clickNav(dm.pillPist, l02F.fId, { type: 'smartAnimate', durationMs: 360, preserveScroll: true });

  clickNav(dm.fixedHdr.brandBtn, dOnboard[0].fId, { type: 'dissolve' });
  bindLangToggle(dm.fixedHdr.langBtn, 'AR');
  clickNav(dm.fixedHdr.cartBtn, l05, { type: 'push', direction: 'left' });
  clickNav(dm.fixedHdr.studioBtn, l06A.fId, { type: 'dissolve' });
  overlayNav(dm.fixedHdr.giftLink, dGiftModal, { position: 'center', direction: 'bottom' });

  dm.featCards.forEach(({ cf }) => clickNav(cf, l04A.fId, { type: 'push', direction: 'left' }));
  dm.reelCards.forEach(({ rc }) => clickNav(rc, l04A.fId, { type: 'push', direction: 'left' }));
  dm.filtCards.forEach(({ cf }) => clickNav(cf, l04A.fId, { type: 'push', direction: 'left' }));
  dm.catCards.forEach(({ card, dest }) => {
    if (dest === 'gift_modal') overlayNav(card, dGiftModal, { position: 'center', direction: 'bottom' });
    else clickNav(card, l03, { type: 'push', direction: 'left' });
  });
});

clickNav(l03Hdr.brandBtn, dOnboard[0].fId, { type: 'dissolve' });
clickNav(l03Hdr.menuLink, l02A.fId, { type: 'push', direction: 'right' });
overlayNav(l03Hdr.giftLink, dGiftModal, { position: 'center', direction: 'bottom' });
clickNav(l03Hdr.studioBtn, l06A.fId, { type: 'dissolve' });
clickNav(l03Hdr.cartBtn, l05, { type: 'push', direction: 'left' });
clickNav(l03Back, l02A.fId, { type: 'push', direction: 'right' });
l03Cards.forEach((c) => clickNav(c, l04A.fId, { type: 'push', direction: 'left' }));

[l04A, l04B].forEach((lp) => {
  clickNav(lp.hdr.brandBtn, dOnboard[0].fId, { type: 'dissolve' });
  clickNav(lp.hdr.menuLink, l02A.fId, { type: 'push', direction: 'right' });
  overlayNav(lp.hdr.giftLink, dGiftModal, { position: 'center', direction: 'bottom' });
  clickNav(lp.hdr.studioBtn, l06A.fId, { type: 'dissolve' });
  clickNav(lp.hdr.cartBtn, l05, { type: 'push', direction: 'left' });
  clickNav(lp.backBtn, l03, { type: 'push', direction: 'right' });
  clickNav(lp.addBtn, l05, { type: 'push', direction: 'left' });
});
clickNav(l04A.chip2, l04B.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });
clickNav(l04A.extra1, l04B.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });
clickNav(l04B.chip1, l04A.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });
clickNav(l04B.extra1, l04A.fId, { type: 'smartAnimate', durationMs: 320, preserveScroll: true });

clickNav(l05Hdr.brandBtn, dOnboard[0].fId, { type: 'dissolve' });
clickNav(l05Hdr.menuLink, l02A.fId, { type: 'push', direction: 'right' });
clickNav(l05Hdr.studioBtn, l06A.fId, { type: 'dissolve' });
clickNav(l05Back, l02A.fId, { type: 'push', direction: 'right' });

[l06A, l06B].forEach((st) => {
  clickNav(st.hdr.brandBtn, dOnboard[0].fId, { type: 'dissolve' });
  clickNav(st.hdr.menuLink, l02A.fId, { type: 'dissolve' });
  clickNav(st.hdr.cartBtn, l05, { type: 'push', direction: 'left' });
  clickNav(st.tabHeart, l06A.fId, { type: 'smartAnimate', durationMs: 360 });
  clickNav(st.tabRibbon, l06B.fId, { type: 'smartAnimate', durationMs: 360 });
  clickNav(st.orderCakeBtn, l05, { type: 'push', direction: 'left' });
});


// ============================================================================
// PAGE 3: CLIENT PRESENTATION SLIDES (1920 × 1080)
// ============================================================================
addPage('03 · Client Presentation Slides (1920×1080)');
cmd('proto.settings', { device: 'None', background: '#140702' });

const SW = 1920;
const SH = 1080;
const sCoords = (i) => ({ x: (i % 3) * (SW + 140), y: Math.floor(i / 3) * (SH + 140) });

function addSlideHeader(slideId, numStr, secLabel, dark) {
  const fg = dark ? CREAM : COCOA;
  const sub = dark ? GOLD : MUTED;
  addInlineLogo(slideId, { x: 96, y: 36, markHeight: 34, wordHeight: 19, color: fg });
  text({ name: 'S Section', parent: slideId, x: 640, y: 50, width: 640, value: secLabel, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 14, letterSpacing: '10%', textAlign: 'center', fill: sub });
  text({ name: 'S Num', parent: slideId, x: 1620, y: 48, width: 204, value: `←   ${numStr} / 06   →`, fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 16, textAlign: 'right', fill: fg });
  rect({ name: 'S Top Line', parent: slideId, x: 96, y: 92, width: 1728, height: 1, fill: dark ? '#4A2410' : BORDER_LINE });
}

const s1 = frame({ name: 'Slide 01 — SAVORY Overview', ...sCoords(0), width: SW, height: SH, fill: ESPRESSO });
addSlideHeader(s1, '01', 'CLIENT PRESENTATION & INTERACTIVE PROTOTYPE', true);
text({ name: 'S1 Eye', parent: s1, x: 96, y: 158, value: 'ARAMOUN & ALEY  ·  DIGITAL STOREFRONT & 3D STUDIO', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 15, letterSpacing: '14%', fill: GOLD });
text({ name: 'S1 Title', parent: s1, x: 96, y: 196, value: 'SAVORY', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 112, fill: CREAM });
text({ name: 'S1 Sub', parent: s1, x: 96, y: 334, width: 880, value: 'Editorial E-Commerce Menu, Fullscreen Video Onboarding & Interactive 3D Cake Studio.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 38, lineHeight: 50, fill: GOLD });
text({ name: 'S1 Body', parent: s1, x: 96, y: 465, width: 840, value: 'Switch to Page 01 (iPhone 17 Pro) or Page 02 (MacBook Air) and press Alt+Ctrl+Enter for the live interactive prototype: fixed headers, horizontal reels & carousel scroll, slide-over drawer, gift box modal, bilingual AR/EN toggle, and interactive 3D studio.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 20, lineHeight: 33, fill: CREAM, opacity: 0.9 });
imageBox({ name: 'S1 P1', parent: s1, x: 1030, y: 150, width: 440, height: 540, file: IMG('reel-dubai-crepe.jpg'), radius: 18 });
imageBox({ name: 'S1 P2', parent: s1, x: 1494, y: 150, width: 330, height: 390, file: IMG('shop-aley-boutique.jpg'), radius: 18 });
imageBox({ name: 'S1 P3', parent: s1, x: 1494, y: 564, width: 330, height: 420, file: IMG('cake-heart-chocolate.jpg'), radius: 18 });
rect({ name: 'S1 Card', parent: s1, x: 1030, y: 714, width: 440, height: 270, fill: COCOA, radius: 18 });
text({ name: 'S1 Card T', parent: s1, x: 1066, y: 774, width: 372, value: 'Borderless UI on Warm Ivory (#F9F6EE), fixed navigation & locked mobile ergonomics.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 28, lineHeight: 40, fill: CREAM });

const s2 = frame({ name: 'Slide 02 — Onboarding Video Experience', ...sCoords(1), width: SW, height: SH, fill: CREAM });
addSlideHeader(s2, '02', 'SCREEN 0 · FULLSCREEN VIDEO ONBOARDING', false);
text({ name: 'S2 Title', parent: s2, x: 96, y: 168, width: 800, value: 'Touch-Swipe Looped Video Onboarding', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 64, lineHeight: 72, fill: COCOA });
text({ name: 'S2 Body', parent: s2, x: 96, y: 344, width: 700, value: 'Responsive finger swipe physics, silent borderless ← / → arrows, authentic Cocoa Pod lockup, and instant entry into the storefront.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 21, lineHeight: 34, fill: COCOA_SOFT });
imageBox({ name: 'S2 M1', parent: s2, x: 896, y: 168, width: 290, height: 760, file: IMG('reel-dubai-crepe.jpg'), radius: 28, withShadow: true });
imageBox({ name: 'S2 M2', parent: s2, x: 1214, y: 168, width: 290, height: 760, file: IMG('reel-cinnamon-rolls.jpg'), radius: 28, withShadow: true });
imageBox({ name: 'S2 M3', parent: s2, x: 1532, y: 168, width: 290, height: 760, file: IMG('reel-strawberry-crepe.jpg'), radius: 28, withShadow: true });

const s3 = frame({ name: 'Slide 03 — Editorial Carousel & Categories', ...sCoords(2), width: SW, height: SH, fill: CREAM });
addSlideHeader(s3, '03', 'SCREEN 1 · EDITORIAL SPLIT SLIDER', false);
text({ name: 'S3 Title', parent: s3, x: 96, y: 196, value: 'Featured', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 88, fill: COCOA });
text({ name: 'S3 Body', parent: s3, x: 96, y: 320, width: 460, value: 'Multi-card 1:1 square carousel with borderless ← 01 02 03 → top navigation and borderless category grid below.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 19, lineHeight: 31, fill: COCOA_SOFT });
imageBox({ name: 'S3 C1', parent: s3, x: 640, y: 204, width: 370, height: 370, file: IMG('reel-dubai-crepe.jpg'), radius: 10, withShadow: true });
imageBox({ name: 'S3 C2', parent: s3, x: 1040, y: 204, width: 370, height: 370, file: IMG('reel-cinnamon-rolls.jpg'), radius: 10, withShadow: true });
imageBox({ name: 'S3 C3', parent: s3, x: 1440, y: 204, width: 370, height: 370, file: IMG('menu-pistachio-waffle.jpg'), radius: 10, withShadow: true });

const s4 = frame({ name: 'Slide 04 — Clean Product Page Architecture', ...sCoords(3), width: SW, height: SH, fill: CREAM });
addSlideHeader(s4, '04', 'SCREEN 3 · BORDERLESS PRODUCT CUSTOMIZATION', false);
imageBox({ name: 'S4 Photo', parent: s4, x: 96, y: 176, width: 520, height: 520, file: IMG('reel-dubai-crepe.jpg'), radius: 12, withShadow: true });
text({ name: 'S4 Title', parent: s4, x: 668, y: 184, width: 1000, value: 'Dubai Kunafa Chocolate Crepe', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 52, fill: COCOA });
text({ name: 'S4 Sub', parent: s4, x: 668, y: 266, width: 960, value: 'All boxed white cards, floating price stickers, pill clutter, and pinch-zoom glitches removed. Sits cleanly on the Warm Ivory canvas with RTL-safe dir="auto" labels.', fontFamily: 'Cabin', fontStyle: 'Regular', fontSize: 20, lineHeight: 32, fill: COCOA_SOFT });

const s5 = frame({ name: 'Slide 05 — 3D Custom Cake Studio', ...sCoords(4), width: SW, height: SH, fill: ESPRESSO });
addSlideHeader(s5, '05', 'SISTER SITE · INTERACTIVE WEBGL 3D STUDIO', true);
text({ name: 'S5 Title', parent: s5, x: 96, y: 186, width: 780, value: 'See Your Cake in 3D Before We Bake It', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 64, lineHeight: 72, fill: CREAM });
imageBox({ name: 'S5 Cake 1', parent: s5, x: 940, y: 164, width: 420, height: 420, file: IMG('cake-heart-chocolate.jpg'), radius: 16 });
imageBox({ name: 'S5 Cake 2', parent: s5, x: 1392, y: 164, width: 420, height: 420, file: IMG('cake-valentine-ribbons.jpg'), radius: 16 });

const s6 = frame({ name: 'Slide 06 — Admin Studio & Live Production URLs', ...sCoords(5), width: SW, height: SH, fill: CREAM });
addSlideHeader(s6, '06', 'ADMIN CMS & MULTI-SITE FIREBASE HOSTING', false);
text({ name: 'S6 Title', parent: s6, x: 96, y: 184, width: 1200, value: 'Live Across 3 Production URLs', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 64, fill: COCOA });
text({ name: 'S6 URLs', parent: s6, x: 96, y: 316, width: 1600, value: '1. Menu Storefront: https://savory-962f3-menu.web.app\n2. 3D Custom Cake Studio: https://savory-962f3-cakes.web.app\n3. Admin Studio: https://savory-962f3-admin.web.app', fontFamily: 'Cabin', fontStyle: 'Bold', fontSize: 28, lineHeight: 54, fill: COCOA_SOFT });

const slideArr = [s1, s2, s3, s4, s5, s6];
cmd('proto.flow.add', { start: s1, name: 'Client Presentation Slides' });
for (let i = 0; i < slideArr.length; i++) {
  clickNav(slideArr[i], slideArr[(i + 1) % slideArr.length], { type: 'push', direction: 'left', durationMs: 480 });
  keyNav(slideArr[i], 'Right', slideArr[(i + 1) % slideArr.length], { type: 'push', direction: 'left', durationMs: 480 });
  keyNav(slideArr[i], 'Left', slideArr[(i - 1 + slideArr.length) % slideArr.length], { type: 'push', direction: 'right', durationMs: 480 });
}

cmd('page.select', { index: 0 });

fs.writeFileSync(TMP_SCRIPT, JSON.stringify(commands));
console.log(`Generated ${commands.length} FigCraft commands across 3 pages. Building SAVORY-Client-Presentation.figcraft...`);

const runOut = execFileSync(
  FIGCRAFT_CLI,
  ['run', '--no-system-fonts', '--out', OUT_FIGCRAFT_PROJECT, TMP_SCRIPT],
  { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
);

const failed = runOut.trim().split('\n').filter((l) => l.includes('"ok":false'));
if (failed.length > 0) {
  console.error('Failed FigCraft steps:', failed.slice(0, 10));
  process.exit(1);
}

fs.copyFileSync(OUT_FIGCRAFT_PROJECT, OUT_FIGCRAFT_DOCS);

// Export PDF slides & render high-res Page 1 (Phone) + Page 2 (Laptop) previews
execFileSync(FIGCRAFT_CLI, ['--no-system-fonts', 'export', OUT_FIGCRAFT_PROJECT, '--page', '03 · Client Presentation Slides (1920×1080)', '--out', OUT_PDF_PROJECT], { encoding: 'utf8' });
execFileSync(FIGCRAFT_CLI, ['--no-system-fonts', 'render', OUT_FIGCRAFT_PROJECT, '--page', '01 · Phone Interactive App (iPhone 17 Pro)', '--out', OUT_PNG_PHONE], { encoding: 'utf8' });
execFileSync(FIGCRAFT_CLI, ['--no-system-fonts', 'render', OUT_FIGCRAFT_PROJECT, '--page', '02 · Laptop Interactive Web (MacBook Air)', '--out', OUT_PNG_LAPTOP], { encoding: 'utf8' });

try {
  fs.unlinkSync(TMP_SCRIPT);
} catch {}

// Update FigCraft Recent Files
const statePath = 'C:\\Users\\User\\AppData\\Roaming\\FigCraft\\state.json';
if (fs.existsSync(statePath)) {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.prefs = state.prefs || {};
    const recents = Array.isArray(state.prefs.recent_files) ? state.prefs.recent_files : [];
    state.prefs.recent_files = [OUT_FIGCRAFT_DOCS, ...recents.filter((p) => p !== OUT_FIGCRAFT_DOCS)];
    fs.writeFileSync(statePath, JSON.stringify(state));
  } catch {}
}

console.log('Done! Files updated:');
console.log(' -', OUT_FIGCRAFT_DOCS);
console.log(' -', OUT_FIGCRAFT_PROJECT);
console.log(' -', OUT_PDF_PROJECT);
console.log(' -', OUT_PNG_PHONE);
console.log(' -', OUT_PNG_LAPTOP);
