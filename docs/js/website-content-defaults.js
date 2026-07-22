/** Default public marketing copy for Website Editor (all left-nav public pages). */

export const WEBSITE_EDITOR_TABS = Object.freeze([
  { id: 'home', label: 'Home' },
  { id: 'binderLanding', label: 'Binder' },
  { id: 'daily', label: 'Daily Booster' },
  { id: 'shop', label: 'Card Shop' },
  { id: 'events', label: 'Events' },
  { id: 'redeem', label: 'Redeem' },
  { id: 'collection', label: 'Collection' },
  { id: 'starBits', label: 'Star Bits' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'trades', label: 'Wishlist & Trades' },
  { id: 'offers', label: 'Trade Offers' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'rewards', label: 'Received Gifts' },
  { id: 'profile', label: 'Profile' },
  { id: 'about', label: 'About' },
  { id: 'socials', label: 'Socials' },
  { id: 'login', label: 'Login' },
  { id: 'shared', label: 'Shared' }
]);

export const HOME_QUICK_LINK_IDS = Object.freeze(['collection', 'shop', 'events', 'offers']);

export function createDefaultWebsiteContent() {
  return {
    version: 2,
    home: {
      eyebrow: 'Welcome, Starlight Collector!',
      title: 'Your magical card adventure starts here.',
      lead: 'Collect Starlight Cards, open booster packs, trade with other collectors, join seasonal events, and keep up with the latest news from Sora Starlight.',
      primaryCta: '✨ Open Daily Booster',
      secondaryCta: '🗂️ Browse Card Binder',
      quickLinks: [
        { id: 'collection', label: '♡ My Cards' },
        { id: 'shop', label: '🛍️ Card Shop' },
        { id: 'events', label: '🎉 Events' },
        { id: 'offers', label: '🤝 Trades' }
      ],
      newsEyebrow: 'Latest from Starlight',
      newsTitle: 'News & Updates',
      newsLoading: 'Loading the latest Starlight news…'
    },
    binderLanding: {
      eyebrow: 'Starlight Cards',
      title: 'Starlight Card Series Binder 📦',
      lead: 'Choose a booster pack to enter that series binder.'
    },
    daily: {
      eyebrow: 'Daily Collector Reward',
      title: 'Daily Free Booster Pack',
      lead: 'Open today’s free pack, reveal four cards one at a time, and grow your Starlight collection. Your next free pack becomes available at midnight Eastern Time.',
      badge: 'FREE • DAILY',
      pullsTitle: 'Your Pulls',
      signInTitle: 'Sign In to Claim Your Free Booster',
      signInLead: 'Daily and Star Bits boosters are saved to your Starlight account.',
      signInCta: 'Sign In to Open',
      morePacksEyebrow: 'Keep the magic going',
      morePacksTitle: 'Want to open more packs?',
      morePacksLead: 'Extra cards are never wasted. Convert duplicate cards into Star Bits, then spend them in the Starlight Booster Shop for more chances to pull Rare, Epic, and Legendary cards.',
      convertCta: 'Convert Extras',
      shopCta: 'Visit Booster Shop'
    },
    shop: {
      eyebrow: 'Magical Booster Marketplace',
      title: 'Starlight Card Shop',
      lead: 'Crack open wonder, chase your favorite cards, and turn every duplicate into fuel for your next magical pull.',
      tagline: 'Exchange your Star Bits for booster packs and more!',
      walletLabel: 'Your Star Bits',
      walletNote: 'Available to spend',
      sectionTitle: '✨ Booster Collection',
      tabAll: 'All Packs',
      tabStandard: 'Standard Packs',
      tabSeries: 'Series Packs',
      tabSpecial: 'Special Packs',
      footerTitle: 'Turn duplicates into more pulls!',
      footerLead: 'Trade in extra cards for Star Bits and keep your collection growing.',
      footerCta: '★ Go To My Star Bits',
      signedOutTitle: 'Sign in to visit the shop ✨',
      signedOutLead: 'Your purchases and new cards need a Starlight account so they can be saved safely.',
      signedOutCta: 'Log In or Create Account',
      emptyCategory: 'No booster packs are currently available in this category.'
    },
    events: {
      eyebrow: 'Seasonal Collections',
      title: '✨ Starlight Events',
      lead: 'Limited-time cards, boosters, achievements, and titles live here.',
      loading: 'Loading active events…',
      emptyTitle: 'No active events right now',
      emptyLead: 'Check back soon for the next Starlight celebration.'
    },
    redeem: {
      eyebrow: 'Special Rewards',
      title: '🎟 Redeem a Code',
      lead: 'Enter a Starlight code from streams, events, giveaways, or promotions. Rewards are saved directly to your account.',
      submitCta: 'Redeem Code',
      returnCta: 'Return to Binder'
    },
    collection: {
      eyebrow: 'My Stuff',
      title: 'My Card Collection & Favorites',
      lead: 'Celebrate your collection, revisit favorite cards, and understand your progress at a glance.',
      tabAll: 'All Cards',
      tabFavorites: 'Favorites',
      tabDuplicates: 'Duplicates',
      allEyebrow: 'Owned Cards',
      allTitle: 'All Cards',
      allLead: 'Your complete cloud-synced collection.',
      favoritesEyebrow: 'Personal Picks',
      favoritesTitle: 'Favorites',
      favoritesLead: 'The cards you have starred for quick access.',
      duplicatesEyebrow: 'Extra Copies',
      duplicatesTitle: 'Duplicate Cards',
      duplicatesLead: 'Extra copies can be converted into Star Bits. Your final copy of every card is always protected.',
      duplicatesCta: '✦ Open Star Bits Exchange'
    },
    starBits: {
      eyebrow: 'Duplicate Card Exchange',
      title: '✦ Star Bits Exchange',
      lead: 'Extra copies can be converted into Star Bits. Your final copy of every card will always stay safely in your collection.',
      ratesTitle: 'Exchange Values',
      chooseTitle: 'Your Extra Copies',
      chooseLead: 'Choose What to Exchange',
      chooseNote: 'One permanent copy of every card is automatically protected.',
      emptyTitle: 'No Duplicates Available',
      emptyLead: 'Your extra copies will appear here after opening Daily Boosters and reward packs.',
      exchangeTitle: 'Conversion Available',
      exchangeCta: 'Convert All Selected',
      exchangeNote: 'One permanent copy of every card is protected.'
    },
    checklist: {
      eyebrow: 'Checklist',
      title: 'My Checklist',
      lead: 'Track every card by set, rarity, collection status, and favorites.',
      exchangeTitle: '✦ Duplicate Card Exchange',
      exchangeLead: 'Review duplicate pulls and convert them into Star Bits without removing your final copy.',
      exchangeCta: 'Review Duplicates'
    },
    trades: {
      eyebrow: 'Collector Connections',
      title: '💫 Wishlist & Trade Binder',
      lead: 'Mark cards you are searching for and list only your extra copies for future trades. Your permanent first copy is always protected.',
      tabWishlist: '♡ Wishlist',
      tabTrade: '↔ For Trade',
      tabAll: '📚 All Cards',
      emptyTitle: 'Nothing here yet',
      emptyWishlist: 'Browse All Cards and add the ones you are searching for.',
      emptyTrade: 'Only duplicate copies can be offered for trade.',
      emptyAction: 'Browse All Cards'
    },
    offers: {
      eyebrow: 'Collector Exchange',
      title: '🤝 Trade Offers',
      lead: 'Offer only duplicate cards. Every collector’s permanent first copy stays protected by the database.',
      tabCompose: 'Create Offer',
      tabIncoming: 'Incoming',
      tabOutgoing: 'Sent',
      composeEmpty: 'Search for a collector by username, display name, or email to start a trade offer.',
      composeCta: 'Create Offer',
      sendCta: 'Send Trade Offer',
      yourOffer: 'Your Offer',
      youRequest: 'You Request',
      emptyIncoming: 'No incoming offers.',
      emptyOutgoing: 'No sent offers.'
    },
    notifications: {
      eyebrow: 'Collector Activity',
      title: '🔔 Notifications',
      lead: 'Trade updates, event announcements, achievements, rewards, and other Starlight news all live here.',
      preferencesTitle: 'Notification Preferences',
      emptyTitle: 'All caught up ✨',
      emptyLead: 'New collector activity will appear here.'
    },
    rewards: {
      eyebrow: 'Your Starlight Mailbox',
      title: '🎁 Received Gifts',
      lead: 'Open gifts from Twitch redeems, reward codes, staff, events, and special promotions whenever you are ready.',
      tabPending: 'Ready to Claim',
      tabClaimed: 'Claimed',
      tabAll: 'All Gifts',
      emptyTitle: 'No gifts here right now ✨',
      emptyLead: 'Twitch redeems, codes, and gifts will appear here.'
    },
    profile: {
      eyebrow: 'Collector Profile',
      title: 'Edit Profile',
      lead: 'Manage your public identity, profile visibility, and collection preferences.',
      wishlistCardTitle: '💫 Wishlist & Trade List',
      wishlistCardLead: 'Choose cards you are seeking and duplicates you are offering.',
      offersCardTitle: '🤝 Trade Offers',
      offersCardLead: 'Review incoming offers, sent offers, and create a new exchange.',
      publicCardTitle: '🌟 Public Collector Profile',
      publicCardLead: 'See how your profile, showcase, achievements, and trade lists appear.',
      accountIntro: 'Manage your local backup and collection data. Cloud ownership remains protected by your account.'
    },
    about: {
      eyebrow: 'About',
      title: 'About the Starlight Card Binder',
      lead: 'A cute interactive collection binder for Sora Starlight cards. Reveal cards, track sets, favorite your pulls, and keep the sparkle goblin economy alive.',
      seriesLoading: 'Loading card series…'
    },
    socials: {
      eyebrow: 'Socials',
      title: 'Socials & Links',
      lead: 'Find Sora Starlight around the web, follow the sparkle trail, and come hang out on stream!',
      links: [
        { id: 'x', icon: '𝕏', label: 'X / Twitter', handle: '@SoraStarlightVT', url: 'https://x.com/SoraStarlightVT' },
        { id: 'twitch', icon: '💜', label: 'Twitch', handle: 'twitch.tv/sorastarlight', url: 'https://www.twitch.tv/sorastarlight' },
        { id: 'youtube', icon: '▶', label: 'YouTube', handle: '@SoraStarlightZone', url: 'https://www.youtube.com/@SoraStarlightZone' },
        { id: 'instagram', icon: '📸', label: 'Instagram', handle: '@sorastarlightvt', url: 'https://www.instagram.com/sorastarlightvt' }
      ]
    },
    login: {
      brandTitle: 'Starlight Card Binder',
      signInDescription: 'Sign in to save your collection and keep it synchronized between devices.',
      signUpDescription: 'Create an account to protect your collection and synchronize it between devices.',
      returnCta: 'Return to the Binder'
    },
    shared: {
      infoStripCollection: 'Cards are earned through Daily Boosters, reward codes, and special events.',
      infoStripCopyright: '© 2026 Sora Starlight'
    }
  };
}

export function cloneDefaultWebsiteContent() {
  return structuredClone(createDefaultWebsiteContent());
}
