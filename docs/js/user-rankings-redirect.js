import { pageHref } from './page-href.js';

const params = new URLSearchParams(location.search);
params.set('section', 'rankings');
location.replace(pageHref('rankings', Object.fromEntries(params.entries())));
