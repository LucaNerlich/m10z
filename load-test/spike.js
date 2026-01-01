import {routes} from './lib/routes.js';
import {getHtml, getJson, think} from './lib/helpers.js';
import {getInt} from './lib/config.js';

const peakVus = getInt('VUS', 30);

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        {duration: __ENV.RAMP_UP || '30s', target: peakVus},
        {duration: __ENV.HOLD || '30s', target: peakVus},
        {duration: __ENV.RAMP_DOWN || '30s', target: 0},
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<4000'],
  },
};

export default function () {
  const r = routes();

  // Prefer fast endpoints to observe saturation without self-DoS.
  getHtml(r.home, {name: 'home'});
  think(0.05, 0.2);

  getJson(r.contentFeed(1, 10), {name: 'api_contentfeed'});
  think(0.05, 0.2);

  // Search can be CPU-ish server-side; include but keep limited to avoid rate limits.
  if (Math.random() < 0.5) {
    getJson(r.search('mi'), {name: 'api_search'});
    think(0.05, 0.2);
  }
}


