import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {after, before, test} from 'node:test';

import {applyEnvPrecedence, ENV_FILES} from './lib/envLoader.mjs';

const PREFIX = 'M10Z_ENV_PRECEDENCE_';
const keys = {
  both: `${PREFIX}BOTH`,
  localOnly: `${PREFIX}LOCAL_ONLY`,
  envOnly: `${PREFIX}ENV_ONLY`,
  shell: `${PREFIX}SHELL`,
  missing: `${PREFIX}MISSING`,
};

let dir;
let localFile;
let envFile;

test('the harness reads .env.local before .env', () => {
  assert.deepEqual(ENV_FILES, ['.env.local', '.env']);
});

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'm10z-env-loader-'));
  localFile = path.join(dir, '.env.local');
  envFile = path.join(dir, '.env');
  await writeFile(
    localFile,
    `${keys.both}=from-local\n${keys.localOnly}=local-only\n${keys.shell}=from-local\n`,
  );
  await writeFile(
    envFile,
    `${keys.both}=from-env\n${keys.envOnly}=env-only\n${keys.shell}=from-env\n`,
  );
});

after(async () => {
  for (const key of Object.values(keys)) {
    delete process.env[key];
  }
  await rm(dir, {recursive: true, force: true});
});

test('the first file wins when both define a key', () => {
  delete process.env[keys.both];
  delete process.env[keys.shell];

  applyEnvPrecedence([localFile, envFile]);

  assert.equal(process.env[keys.both], 'from-local');
});

test('a base environment entry wins over both files', () => {
  delete process.env[keys.shell];

  applyEnvPrecedence([localFile, envFile], {[keys.shell]: 'from-shell'});

  assert.equal(process.env[keys.shell], 'from-shell');
});

test('a missing file is tolerated', () => {
  delete process.env[keys.missing];

  assert.doesNotThrow(() =>
    applyEnvPrecedence([path.join(dir, 'does-not-exist.env'), envFile]),
  );
  assert.equal(process.env[keys.envOnly], 'env-only');
});

test('keys unique to either file survive', () => {
  delete process.env[keys.localOnly];
  delete process.env[keys.envOnly];

  applyEnvPrecedence([localFile, envFile]);

  assert.equal(process.env[keys.localOnly], 'local-only');
  assert.equal(process.env[keys.envOnly], 'env-only');
});
