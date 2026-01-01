import {fail} from 'k6';

export function getTargetOrigin() {
  const raw = __ENV.TARGET_ORIGIN;
  if (!raw) {
    fail('Missing TARGET_ORIGIN env var (e.g. -e TARGET_ORIGIN="https://your-domain.tld")');
  }
  return raw.replace(/\/+$/, '');
}

export function getBool(name, fallback = false) {
  const v = __ENV[name];
  if (v == null) return fallback;
  return String(v).toLowerCase() === 'true' || String(v) === '1';
}

export function getInt(name, fallback) {
  const v = __ENV[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}


