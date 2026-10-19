import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(path.join(dir, file), 'utf8');

test('ramp and spike do not search', () => {
    for (const file of ['ramp.js', 'spike.js']) {
        assert.doesNotMatch(
            read(file),
            /r\.search\(/,
            `${file} must not call the rate-limited search endpoint`,
        );
    }
});

test('smoke still covers search', () => {
    assert.match(read('smoke.js'), /r\.search\(/);
});
