import http from 'k6/http';
import {check, sleep} from 'k6';
import {Counter} from 'k6/metrics';

// Custom metric to make failures explainable in reports (e.g. 429 vs 500).
// k6 will emit per-tag submetrics like:
//   m10z_http_status{status:200,name:home}: { count, rate }
const httpStatusCounter = new Counter('m10z_http_status');
const http2xx = new Counter('m10z_http_2xx');
const http3xx = new Counter('m10z_http_3xx');
const http4xx = new Counter('m10z_http_4xx');
const http5xx = new Counter('m10z_http_5xx');
const http429 = new Counter('m10z_http_429');
const http500 = new Counter('m10z_http_500');
const http502 = new Counter('m10z_http_502');
const http503 = new Counter('m10z_http_503');

// Failures by endpoint "name" tag (keep in sync with the tags used in scripts).
const failHome = new Counter('m10z_fail_home');
const failArticles = new Counter('m10z_fail_articles');
const failPodcasts = new Counter('m10z_fail_podcasts');
const failApiContentfeed = new Counter('m10z_fail_api_contentfeed');
const failApiSearch = new Counter('m10z_fail_api_search');
const failAudiofeedXml = new Counter('m10z_fail_audiofeed_xml');

export function getJson(url, tags = {}) {
  const res = http.get(url, {
    headers: {Accept: 'application/json'},
    tags,
  });
  recordStatus(res.status, tags?.name);
  check(res, {
    'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });
  return res;
}

export function getHtml(url, tags = {}) {
  const res = http.get(url, {
    headers: {Accept: 'text/html'},
    tags,
  });
  recordStatus(res.status, tags?.name);
  check(res, {
    'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });
  return res;
}

export function think(minSeconds = 0.2, maxSeconds = 0.8) {
  const ms = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  sleep(ms);
}

function recordStatus(status, name) {
  const s = Number(status);
  httpStatusCounter.add(1);
  if (Number.isFinite(s)) {
    if (s >= 200 && s < 300) http2xx.add(1);
    else if (s >= 300 && s < 400) http3xx.add(1);
    else if (s >= 400 && s < 500) {
      http4xx.add(1);
      recordFailByName(name);
    } else if (s >= 500 && s < 600) {
      http5xx.add(1);
      recordFailByName(name);
    }

    if (s === 429) http429.add(1);
    if (s === 500) http500.add(1);
    if (s === 502) http502.add(1);
    if (s === 503) http503.add(1);
  }
}

function recordFailByName(name) {
  switch (String(name ?? 'unknown')) {
    case 'home':
      failHome.add(1);
      break;
    case 'articles':
      failArticles.add(1);
      break;
    case 'podcasts':
      failPodcasts.add(1);
      break;
    case 'api_contentfeed':
      failApiContentfeed.add(1);
      break;
    case 'api_search':
      failApiSearch.add(1);
      break;
    case 'audiofeed_xml':
      failAudiofeedXml.add(1);
      break;
    default:
      // ignore
      break;
  }
}


