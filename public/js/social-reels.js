// Verified @savory.chocolate Instagram Reels extracted directly from SAVORY's public feed.
// Shared between Cake Studio Home and Menu Storefront to keep video playback lazy & lightweight.
import { esc, money, tr, isAr } from '/js/common.js';

export const SOCIAL_REELS = [
  {
    id: 'DWmOnzxgilv',
    video: '/img/social/reel-dubai-crepe.mp4',
    poster: '/img/social/reel-dubai-crepe.webp',
    title: 'Dubai Chocolate Crepe',
    caption: 'Dubai Crepe? Who knows ✨🤤',
    likes: 280,
    date: 'Apr 2026',
    productName: 'Dubai Kunafa Chocolate Crepe',
    igUrl: 'https://www.instagram.com/savory.chocolate/reel/DWmOnzxgilv/',
  },
  {
    id: 'DbV61IARz3t',
    video: '/img/social/reel-london-cake.mp4',
    poster: '/img/social/reel-london-cake.webp',
    title: 'London Chocolate Cake',
    caption: 'London Cake… لأن طبقة شوكولا وحدة ما بتكفّي 🤎',
    likes: 96,
    date: 'Jul 2026',
    productName: 'London Layered Chocolate Cake',
    igUrl: 'https://www.instagram.com/savory.chocolate/reel/DbV61IARz3t/',
  },
  {
    id: 'DfphCjTCyJm',
    video: '/img/social/reel-cinnamon-rolls.mp4',
    poster: '/img/social/reel-cinnamon-rolls.webp',
    title: 'Warm Cinnamon Rolls',
    caption: 'Soft, warm, and covered in sweetness 🤎✨',
    likes: 24,
    date: 'Nov 2026',
    productName: 'Warm Frosted Cinnamon Rolls',
    igUrl: 'https://www.instagram.com/savory.chocolate/reel/DfphCjTCyJm/',
  },
  {
    id: 'DfH2turx-CR',
    video: '/img/social/reel-kunafa-cookie.mp4',
    poster: '/img/social/reel-kunafa-cookie.webp',
    title: 'Pistachio Kunafa Cookie',
    caption: 'Special pistachio kunafa cookies 👀',
    likes: 12,
    date: 'Oct 2026',
    productName: 'Pistachio Kunafa Stuffed Cookie',
    igUrl: 'https://www.instagram.com/savory.chocolate/reel/DfH2turx-CR/',
  },
  {
    id: 'DfXbe31xVBd',
    video: '/img/social/reel-pancakes.mp4',
    poster: '/img/social/reel-pancakes.webp',
    title: 'Kinder & Triple Pancakes',
    caption: 'Pancakes hits different 🤤😋',
    likes: 10,
    date: 'Oct 2026',
    productName: 'Kinder & Triple Chocolate Pancakes',
    igUrl: 'https://www.instagram.com/savory.chocolate/reel/DfXbe31xVBd/',
  },
  {
    id: 'DYSMvoyCHQ4',
    video: '/img/social/reel-strawberry-crepe.mp4',
    poster: '/img/social/reel-strawberry-crepe.webp',
    title: 'Strawberry & Banana Crepe',
    caption: 'Watch out for your heart to melt ✨',
    likes: 30,
    date: 'May 2026',
    productName: 'Strawberry & Banana Belgian Crepe',
    igUrl: 'https://www.instagram.com/savory.chocolate/reel/DYSMvoyCHQ4/',
  },
];

/**
 * Renders and wires an interactive Instagram Reels showcase where video streams
 * lazy-load on hover or tap, keeping initial page load crisp.
 */
export function mountReelsStrip(container, { menuItems = [], menuBaseUrl = '', onOpenProduct = null } = {}) {
  if (!container) return;
  const byName = new Map(menuItems.map((m) => [m.name.toLowerCase(), m]));
  const base = String(menuBaseUrl || '').replace(/\/$/, '');

  container.innerHTML = SOCIAL_REELS.map((reel) => {
    const match = byName.get(reel.productName.toLowerCase());
    const orderHref = match
      ? (onOpenProduct ? `#product/${match.id}` : `${base}/#product/${match.id}`)
      : (base || '/#menu');

    return `
      <article class="reel-card" data-reel-id="${esc(reel.id)}" data-reel-src="${esc(reel.video)}">
        <div class="reel-stage" role="button" tabindex="0" aria-label="Play reel: ${esc(reel.title)}">
          <img src="${esc(reel.poster)}" alt="${esc(reel.title)}" loading="lazy" decoding="async">
          <button type="button" class="reel-mute-btn" hidden aria-label="Toggle video sound" title="Unmute / Mute">🔇</button>
          <span class="reel-play-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          </span>
        </div>
        <div class="reel-meta">
          <h3>${esc(tr(reel.title))}</h3>
          <a class="reel-order-link" href="${esc(orderHref)}"${match && onOpenProduct ? ` data-reel-product="${match.id}"` : ''}>
            ${match ? `${money(match.price_cents)} ${isAr() ? '←' : '→'}` : (isAr() ? 'عرض ←' : 'View →')}
          </a>
        </div>
      </article>`;
  }).join('');

  const stopOthers = (activeCard) => {
    container.querySelectorAll('.reel-card.is-playing').forEach((card) => {
      if (card === activeCard) return;
      const vid = card.querySelector('video');
      if (vid) vid.pause();
      card.classList.remove('is-playing');
    });
  };

  const togglePlay = (card) => {
    const stage = card.querySelector('.reel-stage');
    if (!stage) return;
    let vid = stage.querySelector('video');
    if (!vid) {
      vid = document.createElement('video');
      vid.src = card.dataset.reelSrc;
      vid.poster = card.querySelector('img')?.src || '';
      vid.loop = true;
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playsInline = true;
      vid.setAttribute('playsinline', '');
      stage.append(vid);
      const muteBtn = card.querySelector('.reel-mute-btn');
      if (muteBtn) muteBtn.hidden = false;
    }

    if (card.classList.contains('is-playing')) {
      vid.pause();
      card.classList.remove('is-playing');
    } else {
      stopOthers(card);
      card.classList.add('is-playing');
      vid.play().catch(() => {});
    }
  };

  container.addEventListener('click', (e) => {
    const orderLink = e.target.closest('[data-reel-product]');
    if (orderLink && onOpenProduct) {
      e.preventDefault();
      onOpenProduct(Number(orderLink.dataset.reelProduct));
      return;
    }

    const muteBtn = e.target.closest('.reel-mute-btn');
    if (muteBtn) {
      e.stopPropagation();
      const vid = muteBtn.closest('.reel-stage')?.querySelector('video');
      if (!vid) return;
      vid.muted = !vid.muted;
      muteBtn.textContent = vid.muted ? '🔇' : '🔊';
      return;
    }

    const stage = e.target.closest('.reel-stage');
    if (stage) {
      togglePlay(stage.closest('.reel-card'));
    }
  });

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const stage = e.target.closest('.reel-stage');
    if (!stage) return;
    e.preventDefault();
    togglePlay(stage.closest('.reel-card'));
  });
}
