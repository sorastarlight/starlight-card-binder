/** Default shell chrome config (mirrors binder.html). */

import { starBitNavIcon } from './star-bit-icon.js';

export const PUBLIC_SHELL_DESTINATIONS = Object.freeze([
  { value: 'home', label: 'Home' },
  { value: 'binder', label: 'Card Binder' },
  { value: 'daily', label: 'Free Daily Booster' },
  { value: 'shop', label: 'Card Boutique' },
  { value: 'events', label: 'Starlight Events' },
  { value: 'redeem', label: 'Redeem A Code' },
  { value: 'collection', label: 'My Card Album Binder' },
  { value: 'star-bits', label: 'My Star Bits' },
  { value: 'checklist', label: 'Star Registry' },
  { value: 'quests', label: 'Starlight Missions' },
  { value: 'season-pass', label: 'Seasonal Collection Pass' },
  { value: 'trades', label: 'Trade With Others' },
  { value: 'offers', label: 'Trade With Others' },
  { value: 'rankings', label: 'User Rankings' },
  { value: 'feed', label: 'LIVE Feed' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'rewards', label: 'Received Gifts' },
  { value: 'profile', label: 'Profile' },
  { value: 'about', label: 'About' },
  { value: 'socials', label: 'Socials' },
  { value: 'admin', label: 'Administration Hub' }
]);

export const COMMON_NAV_EMOJIS = Object.freeze([
  '✦', '♡', '🏠', '🗂️', '✨', '🛍️', '🎉', '🎟️', '☑', '🤝', '💫', '🔔', '🎁', '👤', '🛠️',
  '⭐', '🌟', '💎', '🎴', '📦', '🛒', '📰', '🎮', '📺', '🔗', '⚙️', '📋', '🧭', '🌈', '💜',
  '𝕏', '▶️'
]);

/** Brand mark presets for navigation (Twitch, YouTube, X). */
export { BRAND_ICONS, BRAND_ICON_IDS, brandIconToken } from './brand-icons.js';

/** Old default labels → new product names (overwrite saved studio defaults). */
export const SHELL_LABEL_REWRITES = Object.freeze({
  daily: Object.freeze([
    'Daily Wish',
    'Free Daily Booster',
    'Daily Booster',
    'Daily Free Booster Pack'
  ]),
  shop: Object.freeze([
    'Starlight Card Shop',
    'Card Shop'
  ]),
  collection: Object.freeze([
    'My Starlight Album',
    'My Card Collection & Favorites',
    'My Card Collection',
    'My Collection'
  ]),
  binder: Object.freeze([
    'The Starlight Card Series Binder',
    'Starlight Card Series Binder'
  ]),
  checklist: Object.freeze([
    'My Checklist',
    'Checklist'
  ]),
  quests: Object.freeze([
    'Collection Quests'
  ]),
  trades: Object.freeze([
    'My Wishlist',
    'Card Exchange',
    'Wishlist & Trades',
    'Trading',
    'Trading Hub'
  ]),
  profile: Object.freeze([
    'Profile & Settings',
    'Profile Settings',
    'My Journal',
    'Journal'
  ]),
  feed: Object.freeze([
    'Pull Feed'
  ])
});

export function createDefaultShellNavigation() {
  return {
    version: 2,
    brandRibbon: 'Starlight Cards',
    pageTitles: {
      home: 'Home',
      binder: 'Starlight Card Gallery',
      collection: 'My Card Album Binder',
      daily: 'Daily Free Booster Pack',
      shop: 'Card Boutique',
      events: 'Starlight Events',
      redeem: 'Redeem A Code',
      'star-bits': 'Star Bits Exchange',
      checklist: 'Star Registry',
      quests: 'Starlight Missions',
      'season-pass': 'Seasonal Collection Pass',
      trades: 'Trade With Others',
      offers: 'Trade With Others',
      rankings: 'User Rankings',
      feed: 'LIVE Feed',
      notifications: 'Notifications',
      rewards: 'Received Gifts',
      profile: 'Profile',
      about: 'About',
      socials: 'Socials',
      admin: 'Administration Hub'
    },
    sidebar: {
      sections: [
        {
          id: 'series',
          label: 'Series',
          icon: { type: 'emoji', value: '✦' },
          staffOnly: false,
          mega: true,
          items: [
            {
              id: 'all-series',
              label: 'All Series',
              icon: { type: 'emoji', value: '🃏' },
              destination: 'binder',
              enabled: true,
              features: ['clearSeries'],
              className: 'shell-series-all'
            }
          ]
        },
        {
          id: 'cards',
          label: 'Cards',
          icon: { type: 'emoji', value: '🃏' },
          staffOnly: false,
          mega: true,
          items: [
            { id: 'binder', label: 'Starlight Card Gallery', icon: { type: 'emoji', value: '🃏' }, destination: 'binder', enabled: true, features: ['clearSeries'] },
            { id: 'checklist', label: 'Star Registry', icon: { type: 'emoji', value: '☑' }, destination: 'checklist', enabled: true, features: [] }
          ]
        },
        {
          id: 'collect',
          label: 'Collect',
          icon: { type: 'emoji', value: '♡' },
          staffOnly: false,
          mega: true,
          items: [
            { id: 'collection', label: 'My Card Album Binder', icon: { type: 'emoji', value: '📒' }, destination: 'collection', enabled: true, features: [] },
            { id: 'daily', label: 'Free Daily Booster', icon: { type: 'emoji', value: '✨' }, destination: 'daily', enabled: true, features: ['dailyBadge'], className: 'shell-daily-link' },
            { id: 'shop', label: 'Card Boutique', icon: { type: 'emoji', value: '🛍️' }, destination: 'shop', enabled: true, features: [], className: 'shell-shop-link' },
            { id: 'star-bits', label: 'My Star Bits', icon: starBitNavIcon(), destination: 'star-bits', enabled: true, features: [] },
            { id: 'quests', label: 'Starlight Missions', icon: { type: 'emoji', value: '🧭' }, destination: 'quests', enabled: true, features: [] },
            { id: 'season-pass', label: 'Seasonal Collection Pass', icon: { type: 'emoji', value: '🌌' }, destination: 'season-pass', enabled: true, features: [] },
            { id: 'redeem', label: 'Redeem A Code', icon: { type: 'emoji', value: '🎟️' }, destination: 'redeem', enabled: true, features: [] }
          ]
        },
        {
          id: 'community',
          label: 'Community',
          icon: { type: 'emoji', value: '🤝' },
          staffOnly: false,
          mega: true,
          items: [
            { id: 'events', label: 'Starlight Events', icon: { type: 'emoji', value: '🎉' }, destination: 'events', enabled: true, features: [] },
            { id: 'trades', label: 'Trade With Others', icon: { type: 'emoji', value: '🤝' }, destination: 'trades', enabled: true, features: ['tradeOfferBadge'] },
            { id: 'rankings', label: 'User Rankings', icon: { type: 'emoji', value: '🏆' }, destination: 'rankings', enabled: true, features: [] },
            { id: 'feed', label: 'LIVE Feed', icon: { type: 'emoji', value: '📡' }, destination: 'feed', enabled: true, features: [] }
          ]
        },
        {
          id: 'account',
          label: 'Account',
          icon: { type: 'emoji', value: '' },
          staffOnly: false,
          mega: false,
          mobileOnly: true,
          items: [
            { id: 'home', label: 'Home', icon: { type: 'emoji', value: '🏠' }, destination: 'home', enabled: true, features: [] },
            { id: 'notifications', label: 'Notifications', icon: { type: 'emoji', value: '🔔' }, destination: 'notifications', enabled: true, features: ['notificationBadge'] },
            { id: 'rewards', label: 'Received Gifts', icon: { type: 'emoji', value: '🎁' }, destination: 'rewards', enabled: true, features: ['receivedGiftBadge'] },
            { id: 'profile', label: 'Profile', icon: { type: 'emoji', value: '👤' }, destination: 'profile', enabled: true, features: [] }
          ]
        },
        {
          id: 'admin',
          label: 'Administration Hub',
          icon: { type: 'emoji', value: '🛠️' },
          staffOnly: true,
          mega: false,
          items: [
            { id: 'admin-hub', label: 'Open Administration Hub', icon: { type: 'emoji', value: '🛠️' }, destination: 'admin', enabled: true, features: ['staffOnly'], className: 'staff-link' }
          ]
        }
      ]
    },
    topBar: {
      quickLinks: [
        { id: 'events-top', label: 'Events', destination: 'events', enabled: true },
        { id: 'trades-top', label: 'Trades', destination: 'trades', enabled: true }
      ]
    },
    accountMenu: {
      signedIn: [
        { id: 'view-profile', label: 'View My Profile', destination: 'collector', enabled: true, features: ['profileLink'] },
        { id: 'profile-settings', label: 'Profile', destination: 'profile', enabled: true, features: [] },
        { id: 'notifications', label: 'View My Notifications', destination: 'notifications', enabled: true, features: ['notificationBadge'] },
        { id: 'rewards', label: 'Received Gifts', destination: 'rewards', enabled: true, features: ['receivedGiftBadge'] },
        { id: 'trades', label: 'Trade With Others', destination: 'trades', enabled: true, features: ['tradeOfferBadge'] },
        { id: 'redeem', label: 'Redeem A Code', destination: 'redeem', enabled: true, features: [] },
        { id: 'sep-1', label: '', destination: '', enabled: true, features: ['separator'] },
        { id: 'sign-out', label: 'Sign Out', destination: '', enabled: true, features: ['signOut'] }
      ],
      signedOut: [
        { id: 'sign-in', label: 'Sign In', destination: '', enabled: true, features: ['signIn'] },
        { id: 'register', label: 'Register', destination: '', enabled: true, features: ['signUp'] }
      ]
    }
  };
}

export function cloneDefaultShellNavigation() {
  return structuredClone(createDefaultShellNavigation());
}
