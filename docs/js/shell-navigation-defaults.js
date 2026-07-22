/** Default shell chrome config (mirrors binder.html). */

export const PUBLIC_SHELL_DESTINATIONS = Object.freeze([
  { value: 'home', label: 'Home' },
  { value: 'binder', label: 'Card Binder' },
  { value: 'daily', label: 'Free Daily Booster' },
  { value: 'shop', label: 'Starlight Card Shop' },
  { value: 'events', label: 'Starlight Events' },
  { value: 'redeem', label: 'Redeem A Code' },
  { value: 'collection', label: 'My Card Collection & Favorites' },
  { value: 'star-bits', label: 'My Star Bits' },
  { value: 'checklist', label: 'My Checklist' },
  { value: 'quests', label: 'Collection Quests' },
  { value: 'season-pass', label: 'Seasonal Collection Pass' },
  { value: 'trades', label: 'Wishlist & Trades' },
  { value: 'offers', label: 'Trade Offers' },
  { value: 'rankings', label: 'User Rankings' },
  { value: 'feed', label: 'LIVE Feed' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'rewards', label: 'Received Gifts' },
  { value: 'profile', label: 'Profile & Settings' },
  { value: 'about', label: 'About' },
  { value: 'socials', label: 'Socials' },
  { value: 'admin', label: 'Administration Hub' }
]);

export const COMMON_NAV_EMOJIS = Object.freeze([
  '✦', '♡', '🏠', '🗂️', '✨', '🛍️', '🎉', '🎟️', '☑', '🤝', '💫', '🔔', '🎁', '👤', '🛠️',
  '⭐', '🌟', '💎', '🎴', '📦', '🛒', '📰', '🎮', '📺', '🔗', '⚙️', '📋', '🧭', '🌈', '💜'
]);

export function createDefaultShellNavigation() {
  return {
    version: 1,
    brandRibbon: 'Card Binder',
    pageTitles: {
      home: 'Home',
      binder: 'The Starlight Card Series Binder',
      collection: 'My Card Collection & Favorites',
      daily: 'Daily Free Booster Pack',
      shop: 'Starlight Card Shop',
      events: 'Starlight Events',
      redeem: 'Redeem A Code',
      'star-bits': 'Star Bits Exchange',
      checklist: 'My Checklist',
      quests: 'Collection Quests',
      'season-pass': 'Seasonal Collection Pass',
      trades: 'Wishlist & Trades',
      offers: 'Trade Offers',
      rankings: 'User Rankings',
      feed: 'LIVE Feed',
      notifications: 'Notifications',
      rewards: 'Received Gifts',
      profile: 'Profile Settings',
      about: 'About',
      socials: 'Socials',
      admin: 'Administration Hub'
    },
    sidebar: {
      sections: [
        {
          id: 'explore',
          label: 'Explore The Starlight Card Series',
          icon: { type: 'emoji', value: '✦' },
          staffOnly: false,
          items: [
            { id: 'home', label: 'Home', icon: { type: 'emoji', value: '🏠' }, destination: 'home', enabled: true, features: [] },
            { id: 'binder', label: 'The Starlight Card Series Binder', icon: { type: 'emoji', value: '🗂️' }, destination: 'binder', enabled: true, features: [] },
            { id: 'daily', label: 'Free Daily Booster', icon: { type: 'emoji', value: '✨' }, destination: 'daily', enabled: true, features: ['dailyBadge'], className: 'shell-daily-link' },
            { id: 'shop', label: 'Starlight Card Shop', icon: { type: 'emoji', value: '🛍️' }, destination: 'shop', enabled: true, features: [], className: 'shell-shop-link' },
            { id: 'events', label: 'Starlight Events', icon: { type: 'emoji', value: '🎉' }, destination: 'events', enabled: true, features: [] },
            { id: 'redeem', label: 'Redeem A Code', icon: { type: 'emoji', value: '🎟️' }, destination: 'redeem', enabled: true, features: [] }
          ]
        },
        {
          id: 'my-stuff',
          label: 'My Stuff',
          icon: { type: 'emoji', value: '♡' },
          staffOnly: false,
          items: [
            { id: 'collection', label: 'My Card Collection & Favorites', icon: { type: 'emoji', value: '♡' }, destination: 'collection', enabled: true, features: [] },
            { id: 'star-bits', label: 'My Star Bits', icon: { type: 'emoji', value: '✦' }, destination: 'star-bits', enabled: true, features: [] },
            { id: 'checklist', label: 'My Checklist', icon: { type: 'emoji', value: '☑' }, destination: 'checklist', enabled: true, features: [] },
            { id: 'quests', label: 'Collection Quests', icon: { type: 'emoji', value: '🧭' }, destination: 'quests', enabled: true, features: [] },
            { id: 'season-pass', label: 'Seasonal Collection Pass', icon: { type: 'emoji', value: '🌌' }, destination: 'season-pass', enabled: true, features: [] },
            { id: 'trading-label', label: 'Community', icon: { type: 'emoji', value: '🤝' }, destination: '', enabled: true, features: ['sectionLabel'] },
            { id: 'trades', label: 'Wishlist & Trades', icon: { type: 'emoji', value: '💫' }, destination: 'trades', enabled: true, features: [] },
            { id: 'offers', label: 'Trade Offers', icon: { type: 'emoji', value: '🤝' }, destination: 'offers', enabled: true, features: ['tradeOfferBadge'] },
            { id: 'rankings', label: 'User Rankings', icon: { type: 'emoji', value: '👤' }, destination: 'rankings', enabled: true, features: [] },
            { id: 'feed', label: 'LIVE Feed', icon: { type: 'emoji', value: '📡' }, destination: 'feed', enabled: true, features: [] }
          ]
        },
        {
          id: 'account',
          label: 'Account',
          icon: { type: 'emoji', value: '' },
          staffOnly: false,
          items: [
            { id: 'notifications', label: 'Notifications', icon: { type: 'emoji', value: '🔔' }, destination: 'notifications', enabled: true, features: ['notificationBadge'] },
            { id: 'rewards', label: 'Received Gifts', icon: { type: 'emoji', value: '🎁' }, destination: 'rewards', enabled: true, features: ['receivedGiftBadge'] },
            { id: 'profile', label: 'Profile & Settings', icon: { type: 'emoji', value: '👤' }, destination: 'profile', enabled: true, features: [] }
          ]
        },
        {
          id: 'admin',
          label: 'Administration Hub',
          icon: { type: 'emoji', value: '🛠️' },
          staffOnly: true,
          items: [
            { id: 'admin-hub', label: 'Open Administration Hub', icon: { type: 'emoji', value: '🛠️' }, destination: 'admin', enabled: true, features: ['staffOnly'], className: 'staff-link' }
          ]
        }
      ]
    },
    topBar: {
      quickLinks: [
        { id: 'top-home', label: 'News & Updates', destination: 'home', enabled: true },
        { id: 'top-binder', label: 'Starlight Card Binder', destination: 'binder', enabled: true },
        { id: 'top-collection', label: 'My Card Collection', destination: 'collection', enabled: true },
        { id: 'top-shop', label: 'Card Shop', destination: 'shop', enabled: true }
      ]
    },
    accountMenu: {
      signedIn: [
        { id: 'view-profile', label: 'View My Profile', destination: 'collector', enabled: true, features: ['profileLink'] },
        { id: 'profile-settings', label: 'Profile & Settings', destination: 'profile', enabled: true, features: [] },
        { id: 'notifications', label: 'View My Notifications', destination: 'notifications', enabled: true, features: ['notificationBadge'] },
        { id: 'rewards', label: 'Received Gifts', destination: 'rewards', enabled: true, features: ['receivedGiftBadge'] },
        { id: 'offers', label: 'Trade Offers', destination: 'offers', enabled: true, features: ['tradeOfferBadge'] },
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
