/**
 * Field groups + preview metadata for the Website Editor visual UI.
 * Keys must exist (or be added) in website-content-defaults.js.
 */

/** @typedef {{ key: string, label?: string, hint?: string, multiline?: boolean, preview?: string }} FieldMeta */
/** @typedef {{ id: string, label: string, description?: string, open?: boolean, fields: FieldMeta[] }} FieldGroup */
/** @typedef {{ description: string, previewUrl: string, groups: FieldGroup[] }} PageMeta */

/** @type {Record<string, PageMeta>} */
export const WEBSITE_PAGE_META = Object.freeze({
  home: {
    description: 'Landing hero, CTAs, quick links, and news heading.',
    previewUrl: 'home.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        description: 'First viewport eyebrow, title, and lead.',
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title', multiline: true },
          { key: 'lead', preview: 'lead', multiline: true }
        ]
      },
      {
        id: 'ctas',
        label: 'Call to action buttons',
        fields: [
          { key: 'primaryCta', label: 'Primary button', preview: 'cta-primary' },
          { key: 'secondaryCta', label: 'Secondary button', preview: 'cta' }
        ]
      },
      {
        id: 'news',
        label: 'News section',
        fields: [
          { key: 'newsEyebrow', preview: 'chip' },
          { key: 'newsTitle', preview: 'chip' },
          { key: 'newsLoading', multiline: true, hint: 'Shown while news posts load.' }
        ]
      }
    ]
  },
  binderLanding: {
    description: 'Binder hero, series splash, grid chrome, filters, and empty states.',
    previewUrl: 'binder.html?view=binder',
    groups: [
      {
        id: 'hero',
        label: 'Page hero',
        open: true,
        description: 'Top banner on the Binder series-select screen.',
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title', multiline: true },
          { key: 'lead', preview: 'lead', multiline: true }
        ]
      },
      {
        id: 'splash',
        label: 'Series booster splash',
        open: true,
        description: 'Headline above the series pack row (“Choose a series…”).',
        fields: [
          {
            key: 'splashTitle',
            label: 'Splash headline',
            preview: 'splash',
            multiline: true,
            hint: 'Large H2 above the series booster packs.'
          },
          {
            key: 'packCollectedLabel',
            label: 'Pack collected label',
            hint: 'Use {owned} and {total}. Example: {owned} / {total} Collected'
          },
          {
            key: 'totalCardsPill',
            label: 'Hero total cards pill',
            hint: 'Use {count}. Example: {count} total cards'
          }
        ]
      },
      {
        id: 'grid',
        label: 'Series card grid',
        fields: [
          { key: 'backToSeriesCta', label: 'Back to series button', preview: 'cta' },
          { key: 'gridBrowseLead', multiline: true, preview: 'lead' },
          { key: 'gridSearchLead', multiline: true },
          {
            key: 'collectedPill',
            label: 'Collected progress pill',
            hint: 'Use {owned} and {total}.'
          },
          { key: 'ownedLabel', hint: 'Use {qty}. Example: Owned ×{qty}' },
          { key: 'notCollectedLabel' }
        ]
      },
      {
        id: 'filters',
        label: 'Binder filters panel',
        fields: [
          { key: 'filtersEyebrow', preview: 'eyebrow' },
          { key: 'filtersTitle', preview: 'title' },
          { key: 'filtersResetCta', label: 'Reset filters button', preview: 'cta' }
        ]
      },
      {
        id: 'empty',
        label: 'Empty & showcase states',
        fields: [
          { key: 'emptyFiltersTitle', preview: 'empty-title' },
          { key: 'emptyFiltersLead', multiline: true, preview: 'empty-lead' },
          { key: 'emptyFiltersCta', preview: 'cta-primary' },
          { key: 'showcaseEmptyEyebrow' },
          { key: 'showcaseEmptyTitle', preview: 'empty-title' },
          { key: 'showcaseEmptyLead', multiline: true, preview: 'empty-lead' },
          { key: 'showcaseEmptyCta' },
          { key: 'showcasePickTitle' },
          { key: 'showcasePickLead', multiline: true }
        ]
      }
    ]
  },
  reveal: {
    description: 'Shared card-pull reveal overlay: pack prompts, pile, results, and badges.',
    previewUrl: 'binder.html?view=binder',
    groups: [
      {
        id: 'hero',
        label: 'Hero & prompts',
        open: true,
        description: 'Header, pack prompt, and pile continue copy.',
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'defaultTitle', preview: 'title' },
          {
            key: 'cardsReady',
            hint: 'Use {count}. Example: {count} cards ready.'
          },
          { key: 'cardsReadyOne' },
          { key: 'packPrompt', preview: 'lead' },
          { key: 'continuePrompt' },
          {
            key: 'pileRemain',
            hint: 'Use {count}. Example: {count} cards remain'
          },
          { key: 'pileRemainOne' },
          { key: 'pileTap' },
          { key: 'pileTapLast' },
          { key: 'closeLabel', hint: 'Close button accessible name.' }
        ]
      },
      {
        id: 'results',
        label: 'Results',
        open: true,
        fields: [
          { key: 'resultsTitle', preview: 'title' },
          {
            key: 'resultsSummary',
            hint: 'Use {total}, {new}, and {duplicates}.'
          },
          {
            key: 'resultsSummaryOneDup',
            hint: 'Use {total} and {new} when there is exactly one duplicate.'
          },
          { key: 'doneCta', preview: 'cta-primary' },
          { key: 'mysteryName' },
          { key: 'fallbackMeta' }
        ]
      },
      {
        id: 'badges',
        label: 'Badges',
        fields: [
          { key: 'badgeNew', preview: 'chip' },
          { key: 'badgeDuplicate', preview: 'chip' },
          { key: 'badgeNewCard', preview: 'chip' }
        ]
      }
    ]
  },
  binderSidePanel: {
    description: 'Binder right-side card info panel actions and labels.',
    previewUrl: 'binder.html?view=binder',
    groups: [
      {
        id: 'actions',
        label: 'Actions',
        open: true,
        fields: [
          { key: 'flipCta', preview: 'cta-primary' },
          { key: 'fullViewCta', preview: 'cta' },
          { key: 'favoriteCta', preview: 'cta' },
          { key: 'favoritedCta', preview: 'cta' }
        ]
      },
      {
        id: 'labels',
        label: 'Labels',
        open: true,
        fields: [
          { key: 'seriesLabel' },
          { key: 'collectorNumberLabel' },
          { key: 'artistLabel' },
          { key: 'ownedLabel' },
          { key: 'notCollectedLabel' },
          {
            key: 'ownedQtyLabel',
            hint: 'Use {qty}. Example: Owned ×{qty}'
          },
          { key: 'descriptionLabel' },
          { key: 'storyLabel' },
          { key: 'additionalLabel' }
        ]
      }
    ]
  },
  binderFullView: {
    description: 'Card full-view analyzer overlay actions and labels.',
    previewUrl: 'binder.html?view=binder',
    groups: [
      {
        id: 'actions',
        label: 'Actions',
        open: true,
        fields: [
          { key: 'flipCta', preview: 'cta' },
          { key: 'favoriteCta', preview: 'cta' },
          { key: 'favoritedCta', preview: 'cta' }
        ]
      },
      {
        id: 'labels',
        label: 'Labels',
        open: true,
        fields: [
          { key: 'scanEyebrow', preview: 'eyebrow' },
          { key: 'seriesLabel' },
          { key: 'collectorNumberLabel' },
          { key: 'illustratorLabel' },
          { key: 'ownedLabel' },
          { key: 'storyLabel' },
          { key: 'additionalLabel' }
        ]
      }
    ]
  },
  daily: {
    description: 'Daily Free Booster portal states, CTAs, and more-packs block.',
    previewUrl: 'daily-booster.html',
    groups: [
      {
        id: 'hero',
        label: 'Page hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' },
          { key: 'badge', preview: 'chip' }
        ]
      },
      {
        id: 'ready',
        label: 'Ready to open',
        open: true,
        fields: [
          { key: 'readyPackLabel', preview: 'chip' },
          { key: 'readyTitle', preview: 'title' },
          { key: 'readyLead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'claimed',
        label: 'Already claimed',
        fields: [
          { key: 'claimedPackLabel' },
          { key: 'claimedTitle' },
          { key: 'claimedLead', multiline: true },
          { key: 'resultsTitle', multiline: true }
        ]
      },
      {
        id: 'disabled',
        label: 'Paused / unavailable',
        fields: [
          { key: 'disabledPackLabel' },
          { key: 'disabledTitle' },
          { key: 'disabledLead', multiline: true }
        ]
      },
      {
        id: 'signin',
        label: 'Signed-out portal',
        fields: [
          { key: 'signInTitle', preview: 'empty-title' },
          { key: 'signInLead', multiline: true, preview: 'empty-lead' },
          { key: 'signInCta', preview: 'cta-primary' }
        ]
      },
      {
        id: 'opening',
        label: 'Opening & results',
        fields: [
          { key: 'checkingPackLabel' },
          { key: 'choosingPackLabel' },
          { key: 'openingPackLabel' },
          { key: 'pullsTitle', preview: 'chip' }
        ]
      },
      {
        id: 'more',
        label: 'More packs card',
        fields: [
          { key: 'morePacksEyebrow' },
          { key: 'morePacksTitle' },
          { key: 'morePacksLead', multiline: true },
          { key: 'loopStep1', preview: 'chip' },
          { key: 'loopStep2', preview: 'chip' },
          { key: 'loopStep3', preview: 'chip' },
          { key: 'loopStep4', preview: 'chip' },
          { key: 'convertCta', preview: 'cta' },
          { key: 'shopCta', preview: 'cta-primary' }
        ]
      }
    ]
  },
  shop: {
    description: 'Card Shop hero, tabs, featured pack CTAs, and empty states.',
    previewUrl: 'booster-shop.html',
    groups: [
      {
        id: 'hero',
        label: 'Page hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' },
          { key: 'tagline', multiline: true }
        ]
      },
      {
        id: 'wallet',
        label: 'Wallet strip',
        fields: [
          { key: 'walletLabel' },
          { key: 'walletNote' },
          { key: 'sectionTitle' }
        ]
      },
      {
        id: 'tabs',
        label: 'Category tabs',
        fields: [
          { key: 'tabAll', preview: 'chip' },
          { key: 'tabStandard', preview: 'chip' },
          { key: 'tabSeries', preview: 'chip' },
          { key: 'tabSpecial', preview: 'chip' }
        ]
      },
      {
        id: 'featured',
        label: 'Featured & pack buttons',
        open: true,
        fields: [
          { key: 'featuredKicker', preview: 'chip' },
          { key: 'openFeaturedCta', preview: 'cta-primary' },
          { key: 'openPackCta', preview: 'cta' },
          { key: 'needBitsCta' },
          { key: 'previewContentsCta' },
          { key: 'whatsInsideCta' }
        ]
      },
      {
        id: 'footer',
        label: 'Footer & empty states',
        fields: [
          { key: 'footerTitle' },
          { key: 'footerLead', multiline: true },
          { key: 'footerCta', preview: 'cta-primary' },
          { key: 'signedOutTitle', preview: 'empty-title' },
          { key: 'signedOutLead', multiline: true, preview: 'empty-lead' },
          { key: 'signedOutCta', preview: 'cta-primary' },
          { key: 'emptyCategory', multiline: true, preview: 'empty-lead' }
        ]
      }
    ]
  },
  events: {
    description: 'Events page hero and empty states.',
    previewUrl: 'events.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'states',
        label: 'Loading & empty',
        fields: [
          { key: 'loading' },
          { key: 'emptyTitle', preview: 'empty-title' },
          { key: 'emptyLead', multiline: true, preview: 'empty-lead' },
          { key: 'boostersHeading' },
          { key: 'achievementsHeading' },
          { key: 'shopCta', preview: 'cta' },
          { key: 'loadError', multiline: true }
        ]
      }
    ]
  },
  redeem: {
    description: 'Redeem code page copy and buttons.',
    previewUrl: 'redeem.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero & actions',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' },
          { key: 'submitCta', preview: 'cta-primary' },
          { key: 'returnCta', preview: 'cta' }
        ]
      }
    ]
  },
  collection: {
    description: 'My Cards tabs, section leads, and empty states.',
    previewUrl: 'collection.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'tabs',
        label: 'Tabs',
        fields: [
          { key: 'tabAll', preview: 'chip' },
          { key: 'tabFavorites', preview: 'chip' },
          { key: 'tabDuplicates', preview: 'chip' }
        ]
      },
      {
        id: 'sections',
        label: 'Section headings',
        fields: [
          { key: 'allEyebrow' },
          { key: 'allTitle' },
          { key: 'allLead', multiline: true },
          { key: 'favoritesEyebrow' },
          { key: 'favoritesTitle' },
          { key: 'favoritesLead', multiline: true },
          { key: 'duplicatesEyebrow' },
          { key: 'duplicatesTitle' },
          { key: 'duplicatesLead', multiline: true, hint: 'Keep wording only — live duplicate counts stay dynamic.' },
          { key: 'duplicatesCta', preview: 'cta' }
        ]
      },
      {
        id: 'empty',
        label: 'Empty states',
        fields: [
          { key: 'emptyAllTitle', preview: 'empty-title' },
          { key: 'emptyAllLead', multiline: true, preview: 'empty-lead' },
          { key: 'emptyAllCta' },
          { key: 'emptyFavoritesTitle' },
          { key: 'emptyFavoritesLead', multiline: true },
          { key: 'emptyFavoritesCta' },
          { key: 'emptyFiltersTitle' },
          { key: 'emptyFiltersLead', multiline: true },
          { key: 'emptyFiltersCta' },
          { key: 'favoritesShowcaseTitle' },
          { key: 'favoritesShowcaseEmptyLead', multiline: true },
          { key: 'favoritesShowcaseCta' }
        ]
      }
    ]
  },
  starBits: {
    description: 'Star Bits exchange headings and empty copy.',
    previewUrl: 'star-bits.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'panels',
        label: 'Panels & actions',
        fields: [
          { key: 'ratesTitle' },
          { key: 'chooseTitle' },
          { key: 'chooseLead' },
          { key: 'chooseNote', multiline: true },
          { key: 'emptyTitle', preview: 'empty-title' },
          { key: 'emptyLead', multiline: true, preview: 'empty-lead' },
          { key: 'exchangeTitle' },
          { key: 'exchangeCta', preview: 'cta-primary' },
          { key: 'exchangeNote', multiline: true }
        ]
      }
    ]
  },
  checklist: {
    description: 'Checklist hero and duplicate exchange card.',
    previewUrl: 'checklist.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'exchange',
        label: 'Duplicate exchange card',
        fields: [
          { key: 'exchangeTitle' },
          { key: 'exchangeLead', multiline: true },
          { key: 'exchangeCta', preview: 'cta-primary' }
        ]
      },
      {
        id: 'filters',
        label: 'Filters panel',
        fields: [
          { key: 'filtersEyebrow' },
          { key: 'filtersTitle' }
        ]
      }
    ]
  },
  trades: {
    description: 'Wishlist & trade list tabs and empty states.',
    previewUrl: 'trade-lists.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'tabs',
        label: 'Tabs',
        fields: [
          { key: 'tabWishlist', preview: 'chip' },
          { key: 'tabTrade', preview: 'chip' },
          { key: 'tabAll', preview: 'chip' }
        ]
      },
      {
        id: 'empty',
        label: 'Empty states',
        fields: [
          { key: 'emptyTitle', preview: 'empty-title' },
          { key: 'emptyWishlist', multiline: true, preview: 'empty-lead' },
          { key: 'emptyTrade', multiline: true },
          { key: 'emptyAction', preview: 'cta' }
        ]
      }
    ]
  },
  offers: {
    description: 'Trade offers composer and inbox copy.',
    previewUrl: 'trade-offers.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'tabs',
        label: 'Tabs & composer',
        fields: [
          { key: 'tabCompose', preview: 'chip' },
          { key: 'tabIncoming', preview: 'chip' },
          { key: 'tabOutgoing', preview: 'chip' },
          { key: 'composeEmpty', multiline: true, preview: 'empty-lead' },
          { key: 'composeCta', preview: 'cta' },
          { key: 'sendCta', preview: 'cta-primary' },
          { key: 'yourOffer' },
          { key: 'youRequest' },
          { key: 'emptyIncoming', multiline: true },
          { key: 'emptyOutgoing', multiline: true }
        ]
      }
    ]
  },
  notifications: {
    description: 'Notifications hero, preferences, and empty inbox.',
    previewUrl: 'notifications.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'prefs',
        label: 'Preferences & empty',
        fields: [
          { key: 'preferencesTitle' },
          { key: 'emptyTitle', preview: 'empty-title' },
          { key: 'emptyLead', multiline: true, preview: 'empty-lead' },
          { key: 'markAllReadCta' },
          { key: 'historyTitle' },
          { key: 'deleteReadCta' },
          { key: 'savePreferencesCta', preview: 'cta-primary' }
        ]
      }
    ]
  },
  rewards: {
    description: 'Received Gifts mailbox tabs and empty state.',
    previewUrl: 'received-rewards.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'tabs',
        label: 'Tabs & empty',
        fields: [
          { key: 'tabPending', preview: 'chip' },
          { key: 'tabClaimed', preview: 'chip' },
          { key: 'tabAll', preview: 'chip' },
          { key: 'emptyTitle', preview: 'empty-title' },
          { key: 'emptyLead', multiline: true, preview: 'empty-lead' }
        ]
      }
    ]
  },
  profile: {
    description: 'Profile settings section titles and activity cards.',
    previewUrl: 'profile-settings.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'sections',
        label: 'Section headings',
        open: true,
        fields: [
          { key: 'imageSectionTitle' },
          { key: 'detailsSectionTitle' },
          { key: 'privacySectionTitle' },
          { key: 'contentSectionTitle' },
          { key: 'featuredSectionTitle' },
          { key: 'activitySectionTitle' },
          { key: 'accountSectionTitle' },
          { key: 'accountIntro', multiline: true }
        ]
      },
      {
        id: 'activity',
        label: 'Activity cards',
        fields: [
          { key: 'wishlistCardTitle', preview: 'chip' },
          { key: 'wishlistCardLead', multiline: true },
          { key: 'offersCardTitle', preview: 'chip' },
          { key: 'offersCardLead', multiline: true },
          { key: 'publicCardTitle', preview: 'chip' },
          { key: 'publicCardLead', multiline: true }
        ]
      }
    ]
  },
  collector: {
    description: 'Public collector profile page: loading/private states, section titles, and social CTAs.',
    previewUrl: 'collector.html',
    groups: [
      {
        id: 'states',
        label: 'Loading & status screens',
        open: true,
        fields: [
          { key: 'loadingTitle', preview: 'title' },
          { key: 'loadingLead', multiline: true, preview: 'lead' },
          { key: 'missingTitle', preview: 'empty-title' },
          { key: 'missingLead', multiline: true, preview: 'empty-lead' },
          { key: 'privateTitle', preview: 'empty-title' },
          { key: 'privateLead', multiline: true, preview: 'empty-lead' },
          { key: 'errorTitle', preview: 'empty-title' },
          { key: 'errorLead', multiline: true, preview: 'empty-lead' },
          { key: 'retryCta', preview: 'cta-primary' },
          { key: 'openBinderCta', preview: 'cta' }
        ]
      },
      {
        id: 'identity',
        label: 'Identity & actions',
        open: true,
        fields: [
          { key: 'defaultBio', multiline: true, hint: 'Fallback bio when a collector has not written one yet.' },
          { key: 'followCta', preview: 'cta' },
          { key: 'followingCta', preview: 'cta-primary' },
          { key: 'giftCta', preview: 'cta-primary' }
        ]
      },
      {
        id: 'sections',
        label: 'Section headings',
        fields: [
          { key: 'statsTitle', preview: 'title' },
          { key: 'rarityTitle', preview: 'title' },
          { key: 'seriesTitle', preview: 'title' },
          { key: 'showcaseTitle', preview: 'title' },
          { key: 'highlightsTitle', preview: 'title' },
          { key: 'tradesTitle', preview: 'title' },
          { key: 'proposeTradeCta', preview: 'cta' },
          { key: 'favoritesTitle', preview: 'title' }
        ]
      }
    ]
  },
  rankings: {
    description: 'Community User Rankings list: hero copy, search/sort labels, empty states, and row actions.',
    previewUrl: 'user-rankings.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      },
      {
        id: 'toolbar',
        label: 'Search & sort',
        open: true,
        fields: [
          { key: 'searchLabel' },
          { key: 'searchPlaceholder', hint: 'Placeholder text inside the search field.' },
          { key: 'sortLabel' },
          { key: 'sortLevel' },
          { key: 'sortCollection' },
          { key: 'sortUnique' },
          { key: 'sortName' }
        ]
      },
      {
        id: 'states',
        label: 'Loading & empty states',
        fields: [
          { key: 'loadingTitle', preview: 'title' },
          { key: 'loadingLead', multiline: true, preview: 'lead' },
          { key: 'emptyTitle', preview: 'empty-title' },
          { key: 'emptyLead', multiline: true, preview: 'empty-lead' },
          { key: 'emptySearchLead', multiline: true }
        ]
      },
      {
        id: 'actions',
        label: 'Row actions',
        fields: [
          { key: 'wishlistCta', preview: 'cta' },
          { key: 'proposeTradeCta', preview: 'cta-primary' },
          { key: 'viewProfileCta', preview: 'cta' },
          { key: 'prevCta' },
          { key: 'nextCta' }
        ]
      }
    ]
  },
  about: {
    description: 'About page hero and series list loading text.',
    previewUrl: 'about.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' },
          { key: 'seriesLoading' }
        ]
      }
    ]
  },
  socials: {
    description: 'Socials hero plus the editable link list below.',
    previewUrl: 'socials.html',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        open: true,
        fields: [
          { key: 'eyebrow', preview: 'eyebrow' },
          { key: 'title', preview: 'title' },
          { key: 'lead', multiline: true, preview: 'lead' }
        ]
      }
    ]
  },
  login: {
    description: 'Login / signup brand and descriptions.',
    previewUrl: 'login.html',
    groups: [
      {
        id: 'brand',
        label: 'Brand & descriptions',
        open: true,
        fields: [
          { key: 'brandTitle', preview: 'title' },
          { key: 'signInDescription', multiline: true, preview: 'lead' },
          { key: 'signUpDescription', multiline: true },
          { key: 'returnCta', preview: 'cta' },
          { key: 'signInModeLabel' },
          { key: 'signUpModeLabel' },
          { key: 'twitchCta', preview: 'cta-primary' },
          { key: 'submitSignIn' },
          { key: 'submitSignUp' }
        ]
      }
    ]
  },
  shared: {
    description: 'Shared footer / info strip lines used across pages.',
    previewUrl: 'about.html',
    groups: [
      {
        id: 'footer',
        label: 'Shared info strip',
        open: true,
        fields: [
          { key: 'infoStripCollection', multiline: true, preview: 'lead' },
          { key: 'infoStripCopyright', preview: 'chip' }
        ]
      }
    ]
  }
});

export function getPageMeta(sectionKey) {
  return WEBSITE_PAGE_META[sectionKey] || null;
}

export function listedFieldKeys(sectionKey) {
  const meta = getPageMeta(sectionKey);
  if (!meta) return [];
  return meta.groups.flatMap((group) => group.fields.map((field) => field.key));
}

/** Fields that can be blanked to hide them on the live page. */
export function isHideableField(fieldMeta = {}) {
  if (fieldMeta.hideable === false) return false;
  if (fieldMeta.hideable === true) return true;
  const key = String(fieldMeta.key || '');
  const preview = String(fieldMeta.preview || '');
  if (['eyebrow', 'title', 'lead', 'splash', 'cta', 'cta-primary', 'chip'].includes(preview)) return true;
  if (/^(eyebrow|title|lead|splashTitle|badge|brandTitle|tagline|primaryCta|secondaryCta|newsEyebrow|newsTitle)$/.test(key)) {
    return true;
  }
  return /(Eyebrow|SectionTitle)$/.test(key);
}
