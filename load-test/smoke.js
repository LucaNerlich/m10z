import {routes} from './lib/routes.js';
import {getHtml, getJson, think} from './lib/helpers.js';

export const options = {
  vus: 1,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
};

export default function () {
  const r = routes();

  getHtml(r.home, {name: 'home'});
  think();

  getHtml(r.articles, {name: 'articles'});
  think();

  getHtml(r.podcasts, {name: 'podcasts'});
  think();

  getJson(r.contentFeed(1, 10), {name: 'api_contentfeed'});
  think();

  // Search: use >=2 chars (your server ignores <2 anyway)
  getJson(r.search('mi'), {name: 'api_search'});
  think();

  // Feeds: hit once per iteration (still low in smoke); remove if you prefer.
  getHtml(r.audioFeedXml, {name: 'audiofeed_xml'});
  think();
}


