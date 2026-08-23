import { legacyBinderRedirectUrl, pageHref } from './page-href.js';

location.replace(legacyBinderRedirectUrl(location.search));
