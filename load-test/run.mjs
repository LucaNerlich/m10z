import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import dotenv from 'dotenv';

// Repo root is not mounted: the harness only needs load-test/ read and
// load-test/reports/ write.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportsDir = path.join(__dirname, 'reports');

// Pinned by digest — this is the `latest` tag as of 2026-10-14. A floating tag
// lets a re-tagged or compromised upstream image execute here.
const K6_IMAGE = 'grafana/k6@sha256:e66db15b860113878fa74670e31f5e274830b7b6e42c8bff28b2f2d86a257603';

function loadEnvFile(p) {
  return dotenv.config({path: p, override: true});
}

// Load .env then .env.local (local overrides)
await loadEnvFile(path.join(__dirname, '.env'));
await loadEnvFile(path.join(__dirname, '.env.local'));

const testName = process.argv[2];
if (!testName || !['smoke', 'ramp', 'spike'].includes(testName)) {
  console.error('Usage: node run.mjs <smoke|ramp|spike>');
  process.exit(2);
}

const targetOriginRaw = process.env.TARGET_ORIGIN?.trim() ?? '';
if (!targetOriginRaw) {
  console.error('Missing TARGET_ORIGIN. Put it in load-test/.env (see load-test/env.example).');
  process.exit(2);
}

const targetOrigin = targetOriginRaw.replace(/\/+$/, '');
const allowHttp = String(process.env.ALLOW_HTTP ?? '').toLowerCase() === 'true' || process.env.ALLOW_HTTP === '1';

if (!allowHttp && !targetOrigin.startsWith('https://')) {
  console.error('TARGET_ORIGIN must start with https:// (set ALLOW_HTTP=true to override for non-prod testing).');
  process.exit(2);
}

await fs.mkdir(reportsDir, {recursive: true});

const scriptPath = `/work/load-test/${testName}.js`;
const summaryPath = `/work/load-test/reports/${testName}-summary.json`;

// Build docker args and only pass through known env vars.
// Mount load-test/ read-only and reports/ read-write: mounting the whole repo
// root read-write would give the container write access to every file in the
// tree, including the .env files the README tells you to create.
const dockerArgs = [
  'run',
  '--rm',
  '-i',
  '-v',
  `${__dirname}:/work/load-test:ro`,
  '-v',
  `${reportsDir}:/work/load-test/reports`,
  '-e',
  `TARGET_ORIGIN=${targetOrigin}`,
];

// Optional k6 env vars (forwarded if set)
const passEnv = [
  'DURATION',
  'VUS',
  'RAMP_UP',
  'STEADY',
  'RAMP_DOWN',
  'HOLD',
  'K6_INSECURE_SKIP_TLS_VERIFY',
];
for (const key of passEnv) {
  const v = process.env[key];
  if (v != null && String(v).length > 0) {
    dockerArgs.push('-e', `${key}=${v}`);
  }
}

dockerArgs.push(
  K6_IMAGE,
  'run',
  `--summary-export=${summaryPath}`,
  scriptPath,
);

const res = spawnSync('docker', dockerArgs, {stdio: 'inherit'});
process.exit(res.status ?? 1);


