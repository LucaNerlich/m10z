import {fail} from 'k6';

export function getTargetOrigin() {
  const raw = __ENV.TARGET_ORIGIN;
  if (!raw) {
    fail('Missing TARGET_ORIGIN env var (e.g. -e TARGET_ORIGIN="https://your-domain.tld")');
  }
  return raw.replace(/\/+$/, '');
}

export function getInt(name, fallback) {
  const v = __ENV[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}


