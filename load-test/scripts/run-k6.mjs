import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testName = process.argv[2];
if (!testName || !['smoke', 'ramp', 'spike'].includes(testName)) {
  console.error('Usage: node ./scripts/run-k6.mjs <smoke|ramp|spike>');
  process.exit(2);
}

const targetOrigin = (process.env.TARGET_ORIGIN || '').replace(/\/+$/, '');
if (!targetOrigin) {
  console.error('Missing TARGET_ORIGIN (e.g. TARGET_ORIGIN="https://your-domain.tld")');
  process.exit(2);
}

const resultsDir = path.join(rootDir, 'results');
mkdirSync(resultsDir, {recursive: true});

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outJson = path.join(resultsDir, `${testName}-${ts}.summary.json`);

// Run k6 via Docker so we don't add a fragile npm dependency for the k6 binary.
// Requires Docker on the machine running the test.
const args = [
  'run',
  '--rm',
  '-i',
  '-e',
  `TARGET_ORIGIN=${targetOrigin}`,
  '-v',
  `${rootDir}:/work`,
  '-w',
  '/work',
  'grafana/k6:latest',
  'run',
  '--summary-export',
  `/work/results/${path.basename(outJson)}`,
  `/work/${testName}.js`,
];

console.log(`[k6] TARGET_ORIGIN=${targetOrigin}`);
console.log(`[k6] test=${testName}`);
console.log(`[k6] summary=${outJson}`);

const child = spawn('docker', args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});


