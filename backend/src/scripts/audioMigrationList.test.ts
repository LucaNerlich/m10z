import {describe, expect, test} from 'vitest';

import {AUDIO_FILE_URLS, EXPECTED_FILE_COUNT} from './audioMigrationList';

describe('audio migration list', () => {
    test('lists exactly the expected number of files', () => {
        expect(AUDIO_FILE_URLS).toHaveLength(EXPECTED_FILE_COUNT);
    });

    test('lists every file once, and only picnotes.de mp3s', () => {
        expect(new Set(AUDIO_FILE_URLS).size).toBe(AUDIO_FILE_URLS.length);
        for (const url of AUDIO_FILE_URLS) {
            expect(url).toMatch(/^https:\/\/m10z\.picnotes\.de\/.+\.mp3$/);
        }
    });
});
