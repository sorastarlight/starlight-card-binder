/** Default public marketing copy for Website Editor. */

export function createDefaultWebsiteContent() {
  return {
    version: 1,
    home: {
      eyebrow: 'Welcome, Starlight Collector!',
      title: 'Your magical card adventure starts here.',
      lead: 'Collect Starlight Cards, open booster packs, trade with other collectors, join seasonal events, and keep up with the latest news from Sora Starlight.',
      primaryCta: { label: '✨ Open Daily Booster' },
      secondaryCta: { label: '🗂️ Browse Card Binder' },
      quickLinks: [
        { id: 'collection', label: '♡ My Cards' },
        { id: 'shop', label: '🛍️ Card Shop' },
        { id: 'events', label: '🎉 Events' },
        { id: 'offers', label: '🤝 Trades' }
      ],
      newsHeading: {
        eyebrow: 'Latest from Starlight',
        title: 'News & Updates'
      }
    },
    about: {
      eyebrow: 'About',
      title: 'About the Starlight Card Binder',
      lead: 'A cute interactive collection binder for Sora Starlight cards. Reveal cards, track sets, favorite your pulls, and keep the sparkle goblin economy alive.'
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
      signUpDescription: 'Create an account to protect your collection and synchronize it between devices.'
    },
    binderLanding: {
      eyebrow: 'Starlight Cards',
      title: 'Starlight Card Series Binder 📦',
      lead: 'Choose a booster pack to enter that series binder.'
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

export const HOME_QUICK_LINK_IDS = Object.freeze(['collection', 'shop', 'events', 'offers']);
