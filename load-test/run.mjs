import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root is one level up from load-test/
const repoRoot = path.resolve(__dirname, '..');
const reportsDir = path.join(__dirname, 'reports');

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
const dockerArgs = [
  'run',
  '--rm',
  '-i',
  '-v',
  `${repoRoot}:/work`,
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
  'grafana/k6:latest',
  'run',
  `--summary-export=${summaryPath}`,
  scriptPath,
);

const res = spawnSync('docker', dockerArgs, {stdio: 'inherit'});
process.exit(res.status ?? 1);


