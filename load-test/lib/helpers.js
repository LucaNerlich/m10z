import http from 'k6/http';
import {check, sleep} from 'k6';

export function getJson(url, tags = {}) {
  const res = http.get(url, {
    headers: {Accept: 'application/json'},
    tags,
  });
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
  check(res, {
    'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });
  return res;
}

export function think(minSeconds = 0.2, maxSeconds = 0.8) {
  const ms = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  sleep(ms);
}


