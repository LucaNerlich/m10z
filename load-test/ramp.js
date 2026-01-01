import {routes} from './lib/routes.js';
import {getHtml, getJson, think} from './lib/helpers.js';
import {getInt} from './lib/config.js';

const targetVus = getInt('VUS', 10);

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        {duration: __ENV.RAMP_UP || '1m', target: targetVus},
        {duration: __ENV.STEADY || '2m', target: targetVus},
        {duration: __ENV.RAMP_DOWN || '30s', target: 0},
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2500'],
  },
};

export default function () {
  const r = routes();

  // Cycle through "page-like" endpoints
  getHtml(r.home, {name: 'home'});
  think();

  getHtml(r.articles, {name: 'articles'});
  think();

  getHtml(r.podcasts, {name: 'podcasts'});
  think();

  // Light APIs
  getJson(r.contentFeed(1, 10), {name: 'api_contentfeed'});
  think();

  // Search queries (>=2 chars)
  const queries = ['mi', 'po', 'ar', 'ga', 'ze'];
  const q = queries[Math.floor(Math.random() * queries.length)];
  getJson(r.search(q), {name: 'api_search'});
  think();

  // Feeds: keep this rare during ramp tests to avoid rate limits.
  if (Math.random() < 0.02) {
    getHtml(r.audioFeedXml, {name: 'audiofeed_xml'});
    think();
  }
}


