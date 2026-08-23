import { supabase } from './supabase-client.js';
import { signOut } from './auth.js';
import { getMyStaffAccess } from './staff-service.js';
import { getMyTradeOffers } from './trade-offer-service.js';
import { getMyNotifications } from './notification-service.js';
import { getReceivedRewards } from './received-rewards-service.js';
import { getShellNavigation } from './shell-navigation-service.js';
import { getMyProfileExtras } from './profile-extras-service.js';
import { applyAvatarFrameClass } from './avatar-frame-utils.js';
import { levelFromPoints } from './collector-level.js';
import {
  currentPageFile,
  loginPageHref,
  navPageId,
  pageHref,
  profilePageHref
} from './page-href.js';

const MOTION_KEY = 'starlight-reduce-motion';
const STAR_BIT_ICON = 'site_assets/icons/star-bit.png?v=2';
const LOGO = 'site_assets/Sora_Starlight_Logo_Primary.png';

const AUTH_PAGES = new Set([
  'pack', 'album', 'shop', 'bits', 'gifts', 'settings', 'notifications', 'trades',
  'redeem', 'checklist', 'evolution', 'quests', 'season-pass', 'import', 'admin'
]);

const DEFAULT_SERIES = Object.freeze([
  {
    name: 'Rising Star',
    href: 'series.html',
    gallery: 'gallery.html'
  }
]);

let chromeState = {
  signedIn: false,
  profileUsername: '',
  starBits: 0,
  collectorLevel: 1,
  noticeCount: 0,
  giftCount: 0,
  tradeCount: 0,
  isStaff: false,
  seriesLinks: [...DEFAULT_SERIES]
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

export function safeNext(value) {
  const next = String(value || '').trim();
  if (!next || /[:\\]/.test(next) || next.includes('..')) return 'index.html';
  if (!/^[a-z0-9][a-z0-9._-]*\.html(?:\?[\w&=.%-]*)?$/i.test(next)) return 'index.html';
  return next;
}

function bitsLabel(amount) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString()} Star Bits`;
}

function bitsMarkup(amount) {
  return `<span class="star-bits"><img src="${STAR_BIT_ICON}" alt="" width="18" height="18" decoding="async"><span>${Number(amount || 0).toLocaleString()}</span></span>`;
}

export function avatarHtml(photoUrl, name = '', className = 'avatar') {
  const src = String(photoUrl || '').trim();
  if (src) return `<img class="${className}" src="${esc(src)}" alt="">`;
  const letter = String(name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return `<span class="${className} avatar-fallback" aria-hidden="true">${esc(letter)}</span>`;
}

function headerMarkup(page) {
  const current = (id) => (page === id ? ' aria-current="page"' : '');
  const itemCurrent = (ids) => (ids.includes(page) ? ' is-current' : '');
  const { signedIn, starBits, noticeCount, giftCount, tradeCount, isStaff, seriesLinks } = chromeState;
  const user = chromeState.user;
  const giftBadge = giftCount ? `<span class="menu-badge">${giftCount}</span>` : '';
  const noticeBadge = noticeCount ? `<span class="menu-badge">${noticeCount}</span>` : '';
  const tradeBadge = tradeCount ? `<span class="menu-badge">${tradeCount}</span>` : '';
  const profileLink = profilePageHref(chromeState.profileUsername);

  const accountBar = signedIn ? `
          <a class="notice-bell" href="${pageHref('notifications')}" aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 22a2.3 2.3 0 0 0 2.3-2.3H9.7A2.3 2.3 0 0 0 12 22Zm8-6V11a8 8 0 0 0-5.6-7.6V2.8a2.4 2.4 0 1 0-4.8 0v.6A8 8 0 0 0 4 11v5l-2 2.4V20h20v-1.6L20 16Z"/></svg>
            ${noticeCount ? `<i class="notice-dot"></i>` : ''}
          </a>
          <div class="account-menu-wrap" data-account-menu>
            <button class="account-menu-button" type="button" aria-expanded="false" aria-haspopup="menu" aria-controls="account-menu">
              <span class="account-avatar-ring" data-tcg-avatar>${avatarHtml(user?.avatarUrl, user?.name)}</span>
              <span class="account-main">
                <strong>${esc(user?.name || 'Collector')}</strong>
                <span class="account-handle">${user?.handle ? `@${esc(user.handle)}` : 'Starlight account'} <i aria-hidden="true">▾</i></span>
                <span class="account-mini-stats">
                  <span>Lv. ${chromeState.collectorLevel}</span>
                  <span class="account-bits" data-wallet aria-label="${bitsLabel(starBits)}">${bitsMarkup(starBits)}</span>
                </span>
              </span>
            </button>
            <div class="account-menu" id="account-menu" role="menu" hidden>
              <a role="menuitem" href="${profileLink}">Visit My Profile</a>
              <a role="menuitem" href="${pageHref('notifications')}">Notifications${noticeBadge}</a>
              <a role="menuitem" href="${pageHref('rewards')}">Received Gifts${giftBadge}</a>
              <a role="menuitem" href="${pageHref('trades', { section: 'progress' })}">Trade Offers${tradeBadge}</a>
              <a role="menuitem" href="${pageHref('redeem')}">Redeem A Code</a>
              <a role="menuitem" href="${pageHref('profile')}"${current('settings')}>Account Settings</a>
              ${isStaff ? `<a role="menuitem" href="${pageHref('admin')}"${current('admin')}>Administration Hub</a>` : ''}
              <hr class="account-menu-sep" aria-hidden="true">
              <button type="button" role="menuitem" class="account-signout" data-sign-out>Sign Out</button>
            </div>
          </div>` : `
          <div class="account-guest">
            <a class="pill light" href="${loginPageHref('signin')}">Log in</a>
            <a class="pill" href="${loginPageHref('signup')}">Register</a>
          </div>`;

  const seriesMega = seriesLinks.map((entry) =>
    `<a href="${esc(entry.href)}">${esc(entry.name)}</a>`
  ).join('');
  const galleryMega = seriesLinks.map((entry) =>
    `<a href="${esc(entry.gallery || pageHref('binder'))}">${esc(entry.name)}</a>`
  ).join('');

  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="masthead" data-masthead>
      <a class="brand" href="index.html" aria-label="Sora Starlight home">
        <img src="${LOGO}" alt="Sora Starlight">
      </a>
      <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false">Menu</button>
      <div class="account-bar">${accountBar}</div>
      <div class="nav-wrap">
        <nav class="primary-nav" aria-label="Main">
          <div class="nav-item${itemCurrent(['series'])}">
            <button class="nav-link" type="button" aria-expanded="false">Series</button>
            <div class="mega">
              <p>Current series</p>
              ${seriesMega}
              <a href="series.html">See all series</a>
            </div>
          </div>
          <div class="nav-item${itemCurrent(['gallery'])}">
            <button class="nav-link" type="button" aria-expanded="false">Cards</button>
            <div class="mega">
              <p>Card galleries</p>
              ${galleryMega}
              <a href="gallery.html"${current('gallery')}>Starlight Card Gallery</a>
              <a href="${pageHref('checklist')}">Star Registry</a>
            </div>
          </div>
          <div class="nav-item${itemCurrent(['pack', 'album', 'bits', 'gifts', 'settings', 'profile', 'trades', 'redeem', 'checklist', 'evolution', 'quests', 'season-pass', 'feed', 'import'])}">
            <button class="nav-link" type="button" aria-expanded="false">Collect</button>
            <div class="mega">
              <p>Collector tools</p>
              <a href="${pageHref('daily')}">Free daily booster</a>
              <a href="${pageHref('collection')}"${current('album')}>My album</a>
              <a href="${profileLink}">My profile</a>
              <a href="${pageHref('profile')}"${current('settings')}>Account settings</a>
              <a href="${pageHref('star-bits')}"${current('bits')}>Star Bits exchange</a>
              <a href="${pageHref('rewards')}"${current('gifts')}>Received gifts</a>
              <a href="${pageHref('trades')}"${current('trades')}>Trade with others</a>
              <a href="${pageHref('starlight-evolution')}"${current('evolution')}>Starlight evolution</a>
              <a href="${pageHref('quests')}"${current('quests')}>Starlight missions</a>
              <a href="${pageHref('feed')}"${current('feed')}>LIVE feed</a>
              <a href="${pageHref('about')}"${current('collect')}>How to collect</a>
            </div>
          </div>
          <a class="top-link nav-link" href="${pageHref('about')}"${current('collect')}>How to collect</a>
          <a class="top-link nav-link" href="news.html"${current('news')}>News</a>
          <a class="top-link nav-link" href="${pageHref('shop')}"${current('shop')}>Shop</a>
          <a class="top-link nav-link" href="${pageHref('events')}"${current('events')}>Events</a>
        </nav>
        <button class="motion-toggle" type="button" data-motion aria-pressed="false">Reduce motion</button>
      </div>
    </header>
  `;
}

function footerMarkup() {
  const seriesLinks = chromeState.seriesLinks
    .map((entry) => `<a href="${esc(entry.href)}">${esc(entry.name)}</a>`)
    .join('');
  const profileLink = profilePageHref(chromeState.profileUsername);
  return `
    <footer class="site-footer">
      <div class="footer-grid">
        <div>
          <h2>Starlight Cards</h2>
          <p>Collect magical Starlight Cards, open boosters, trade with other collectors, and keep your album synced in the cloud.</p>
          <div class="socials">
            <a href="https://www.twitch.tv/sorastarlight" rel="noopener" target="_blank">Twitch</a>
            <a href="https://x.com/SoraStarlightVT" rel="noopener" target="_blank">X</a>
            <a href="https://www.youtube.com/@SoraStarlightZone" rel="noopener" target="_blank">YouTube</a>
            <a href="https://www.instagram.com/sorastarlightvt" rel="noopener" target="_blank">Instagram</a>
          </div>
        </div>
        <div>
          <h3>Series</h3>
          ${seriesLinks}
          <a href="gallery.html">Card gallery</a>
          <a href="news.html">News</a>
        </div>
        <div>
          <h3>Collect</h3>
          <a href="${pageHref('shop')}">Card shop</a>
          <a href="${pageHref('star-bits')}">Star Bits exchange</a>
          <a href="${pageHref('collection')}">My album</a>
          <a href="${profileLink}">My profile</a>
          <a href="${pageHref('profile')}">Account settings</a>
          <a href="${pageHref('rewards')}">Received gifts</a>
        </div>
      </div>
      <p class="legal">© 2026 Sora Starlight. Extra copies convert to Star Bits at the original rarity rates. Your last copy of every card stays protected.</p>
    </footer>
  `;
}

function applyMotion(enabled) {
  document.documentElement.classList.toggle('reduce-motion', enabled);
  const button = document.querySelector('[data-motion]');
  if (button) {
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.textContent = enabled ? 'Motion off' : 'Reduce motion';
  }
}

function refreshWallet() {
  const wallet = document.querySelector('[data-wallet]');
  if (!wallet) return;
  wallet.innerHTML = bitsMarkup(chromeState.starBits);
  wallet.setAttribute('aria-label', `${bitsLabel(chromeState.starBits)} — Star Bits exchange`);
}

function bindChromeInteractions() {
  const masthead = document.querySelector('[data-masthead]');
  const nav = document.querySelector('.primary-nav');
  const hoverMenus = window.matchMedia('(hover: hover) and (pointer: fine)');

  function closeMenus(except) {
    document.querySelectorAll('.nav-item').forEach((item) => {
      if (item === except) return;
      item.classList.remove('is-open');
      const button = item.querySelector('button.nav-link');
      button?.setAttribute('aria-expanded', 'false');
      if (button && document.activeElement === button) button.blur();
    });
  }

  document.querySelector('[data-menu-toggle]')?.addEventListener('click', () => {
    const open = masthead.classList.toggle('is-open');
    document.querySelector('[data-menu-toggle]')?.setAttribute('aria-expanded', String(open));
    if (!open) closeMenus();
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    const button = item.querySelector('button.nav-link');
    if (!button) return;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = !item.classList.contains('is-open');
      closeMenus();
      item.classList.toggle('is-open', willOpen);
      button.setAttribute('aria-expanded', String(willOpen));
    });
  });

  nav?.addEventListener('pointerover', (event) => {
    const item = event.target.closest('.nav-item');
    if (item) closeMenus(item);
    else closeMenus();
  });
  nav?.addEventListener('mouseleave', () => {
    if (hoverMenus.matches) closeMenus();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.primary-nav')) closeMenus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus();
  });

  const accountWrap = document.querySelector('[data-account-menu]');
  const accountButton = accountWrap?.querySelector('.account-menu-button');
  const accountMenu = accountWrap?.querySelector('.account-menu');
  function closeAccountMenu() {
    if (!accountButton || !accountMenu) return;
    accountButton.setAttribute('aria-expanded', 'false');
    accountMenu.hidden = true;
  }
  accountButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    closeMenus();
    const open = accountButton.getAttribute('aria-expanded') !== 'true';
    accountButton.setAttribute('aria-expanded', String(open));
    accountMenu.hidden = !open;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-account-menu]')) closeAccountMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAccountMenu();
  });

  document.querySelector('[data-sign-out]')?.addEventListener('click', async () => {
    try {
      await signOut();
    } catch (error) {
      console.warn('[Starlight] Sign out failed', error);
    }
    location.href = 'index.html';
  });

  const stored = localStorage.getItem(MOTION_KEY) === '1';
  applyMotion(stored);
  document.querySelector('[data-motion]')?.addEventListener('click', () => {
    const next = !document.documentElement.classList.contains('reduce-motion');
    localStorage.setItem(MOTION_KEY, next ? '1' : '0');
    applyMotion(next);
    window.dispatchEvent(new CustomEvent('starlight-motion-change', { detail: { enabled: next } }));
  });
}

async function hydrateBadges() {
  if (!chromeState.signedIn) {
    chromeState.noticeCount = 0;
    chromeState.giftCount = 0;
    chromeState.tradeCount = 0;
    return;
  }
  try {
    const data = await getMyNotifications(20);
    chromeState.noticeCount = Number(data?.unreadCount || 0);
  } catch {
    chromeState.noticeCount = 0;
  }
  try {
    const data = await getReceivedRewards('pending');
    chromeState.giftCount = Number(data?.pendingCount ?? data?.rewards?.length ?? 0);
  } catch {
    chromeState.giftCount = 0;
  }
  try {
    const offers = await getMyTradeOffers();
    chromeState.tradeCount = (offers?.incoming || []).filter((o) => o.status === 'pending').length;
  } catch {
    chromeState.tradeCount = 0;
  }
}

async function hydrateSeriesLinks() {
  try {
    const navigation = await getShellNavigation();
    const explore = navigation?.sections?.find((s) => /explore/i.test(s.label || ''));
    const seriesItems = (explore?.items || []).filter((item) => item.destination === 'binder' || /series|gallery|binder/i.test(item.label || ''));
    if (seriesItems.length) {
      chromeState.seriesLinks = seriesItems.map((item) => ({
        name: item.label || 'Starlight Series',
        href: 'series.html',
        gallery: pageHref(item.destination || 'binder')
      }));
    }
  } catch {
    chromeState.seriesLinks = [...DEFAULT_SERIES];
  }
}

async function hydrateAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;
  chromeState.signedIn = Boolean(user);
  chromeState.user = null;
  chromeState.profileUsername = '';
  chromeState.starBits = 0;
  chromeState.collectorLevel = 1;
  chromeState.isStaff = false;

  if (!user) return;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username,display_name,avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('collector_xp')
      .eq('user_id', user.id)
      .maybeSingle();
    chromeState.profileUsername = profile?.username || '';
    chromeState.collectorLevel = levelFromPoints(Number(wallet?.collector_xp || 0)).level;
    chromeState.user = {
      name: profile?.display_name || profile?.username || user.email || 'Collector',
      handle: profile?.username || '',
      avatarUrl: profile?.avatar_url || ''
    };
    try {
      const extras = await getMyProfileExtras();
      const avatarHost = document.querySelector('[data-tcg-avatar]');
      if (avatarHost) {
        const frameId = extras?.selectedFrameId || '';
        const frame = (extras?.frames || []).find((f) => f.id === frameId) || null;
        applyAvatarFrameClass(avatarHost, frame);
      }
    } catch {
      /* optional */
    }
    const access = await getMyStaffAccess();
    chromeState.isStaff = Boolean(access?.isStaff);
  } catch (error) {
    console.warn('[Starlight] Profile hydration failed', error);
    chromeState.user = { name: user.email || 'Collector', handle: '', avatarUrl: '' };
  }

  try {
    const { data: preview, error } = await supabase.rpc('get_star_bits_exchange_preview');
    if (!error) chromeState.starBits = Number(preview?.starBitsBalance ?? preview?.star_bits_balance ?? 0);
  } catch {
    /* optional */
  }

  await hydrateBadges();
}

function renderChrome() {
  const page = navPageId();
  const headerHost = document.getElementById('site-header');
  const footerHost = document.getElementById('site-footer');
  if (headerHost) headerHost.innerHTML = headerMarkup(page);
  if (footerHost) footerHost.innerHTML = footerMarkup();
  bindChromeInteractions();
  refreshWallet();
}

export async function bootTcgChrome() {
  const page = navPageId();
  await hydrateSeriesLinks();
  await hydrateAccount();

  if (page === 'admin' && !chromeState.isStaff) {
    location.replace('index.html');
    return;
  }
  if (AUTH_PAGES.has(page) && !chromeState.signedIn) {
    location.replace(`login.html?mode=signin&next=${encodeURIComponent(currentPageFile())}`);
    return;
  }
  if (page === 'login') {
    await hydrateAccount();
    if (chromeState.signedIn) {
      const next = new URLSearchParams(location.search).get('next');
      location.replace(next ? safeNext(next) : profilePageHref(chromeState.profileUsername));
      return;
    }
  }

  renderChrome();

  supabase.auth.onAuthStateChange(() => {
    hydrateAccount().then(renderChrome);
  });

  window.addEventListener('starlight-wallet-update', () => {
    hydrateAccount().then(renderChrome);
  });
}

bootTcgChrome();
