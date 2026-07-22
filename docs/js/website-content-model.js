import { cloneDefaultWebsiteContent, HOME_QUICK_LINK_IDS } from './website-content-defaults.js';

const QUICK_LINK_SET = new Set(HOME_QUICK_LINK_IDS);

function text(value, fallback = '', max = 240) {
  const next = String(value ?? '').trim();
  if (!next) return fallback;
  return next.slice(0, max);
}

function safeHttpUrl(value, fallback = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

export function sanitizeWebsiteContent(input) {
  const defaults = cloneDefaultWebsiteContent();
  const source = input && typeof input === 'object' ? input : {};

  const homeSource = source.home && typeof source.home === 'object' ? source.home : {};
  const aboutSource = source.about && typeof source.about === 'object' ? source.about : {};
  const socialsSource = source.socials && typeof source.socials === 'object' ? source.socials : {};
  const loginSource = source.login && typeof source.login === 'object' ? source.login : {};
  const binderSource = source.binderLanding && typeof source.binderLanding === 'object' ? source.binderLanding : {};
  const sharedSource = source.shared && typeof source.shared === 'object' ? source.shared : {};

  const quickLinks = Array.isArray(homeSource.quickLinks)
    ? homeSource.quickLinks
      .map((link, index) => {
        const id = String(link?.id || HOME_QUICK_LINK_IDS[index] || '').trim();
        if (!QUICK_LINK_SET.has(id)) return null;
        const fallback = defaults.home.quickLinks.find(entry => entry.id === id) || defaults.home.quickLinks[index];
        return {
          id,
          label: text(link?.label, fallback?.label || id, 40)
        };
      })
      .filter(Boolean)
      .slice(0, 4)
    : defaults.home.quickLinks;

  const orderedQuickLinks = HOME_QUICK_LINK_IDS.map(id => (
    quickLinks.find(link => link.id === id)
    || defaults.home.quickLinks.find(link => link.id === id)
  )).filter(Boolean);

  const socialLinks = Array.isArray(socialsSource.links)
    ? socialsSource.links.slice(0, 8).map((link, index) => {
      const fallback = defaults.socials.links[index] || defaults.socials.links[0];
      return {
        id: text(link?.id, fallback.id, 32) || `link-${index}`,
        icon: text(link?.icon, fallback.icon, 8),
        label: text(link?.label, fallback.label, 40),
        handle: text(link?.handle, fallback.handle, 60),
        url: safeHttpUrl(link?.url, fallback.url)
      };
    })
    : defaults.socials.links;

  if (!socialLinks.length) throw new Error('At least one social link is required.');

  return {
    version: 1,
    home: {
      eyebrow: text(homeSource.eyebrow, defaults.home.eyebrow, 80),
      title: text(homeSource.title, defaults.home.title, 120),
      lead: text(homeSource.lead, defaults.home.lead, 400),
      primaryCta: {
        label: text(homeSource.primaryCta?.label, defaults.home.primaryCta.label, 48)
      },
      secondaryCta: {
        label: text(homeSource.secondaryCta?.label, defaults.home.secondaryCta.label, 48)
      },
      quickLinks: orderedQuickLinks,
      newsHeading: {
        eyebrow: text(homeSource.newsHeading?.eyebrow, defaults.home.newsHeading.eyebrow, 80),
        title: text(homeSource.newsHeading?.title, defaults.home.newsHeading.title, 80)
      }
    },
    about: {
      eyebrow: text(aboutSource.eyebrow, defaults.about.eyebrow, 40),
      title: text(aboutSource.title, defaults.about.title, 120),
      lead: text(aboutSource.lead, defaults.about.lead, 400)
    },
    socials: {
      eyebrow: text(socialsSource.eyebrow, defaults.socials.eyebrow, 40),
      title: text(socialsSource.title, defaults.socials.title, 120),
      lead: text(socialsSource.lead, defaults.socials.lead, 400),
      links: socialLinks
    },
    login: {
      brandTitle: text(loginSource.brandTitle, defaults.login.brandTitle, 60),
      signInDescription: text(loginSource.signInDescription, defaults.login.signInDescription, 220),
      signUpDescription: text(loginSource.signUpDescription, defaults.login.signUpDescription, 220)
    },
    binderLanding: {
      eyebrow: text(binderSource.eyebrow, defaults.binderLanding.eyebrow, 60),
      title: text(binderSource.title, defaults.binderLanding.title, 120),
      lead: text(binderSource.lead, defaults.binderLanding.lead, 240)
    },
    shared: {
      infoStripCollection: text(sharedSource.infoStripCollection, defaults.shared.infoStripCollection, 220),
      infoStripCopyright: text(sharedSource.infoStripCopyright, defaults.shared.infoStripCopyright, 80)
    }
  };
}

export function mergeWebsiteContent(remote) {
  try {
    return sanitizeWebsiteContent(remote && typeof remote === 'object' ? remote : cloneDefaultWebsiteContent());
  } catch {
    return cloneDefaultWebsiteContent();
  }
}
