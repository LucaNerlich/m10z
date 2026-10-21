import {describe, expect, test} from 'vitest';

import {metadata} from './page';

describe('Apps index metadata', () => {
    test('uses the shared builder so canonical and social tags are complete', () => {
        expect(metadata.title).toBe('Apps');
        expect(metadata.alternates?.canonical).toContain('/apps');
        expect(metadata.openGraph).toMatchObject({siteName: 'Mindestens 10 Zeichen'});
        expect(metadata.openGraph).toHaveProperty('locale');
    });
});
