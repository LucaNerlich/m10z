import {describe, expect, test} from 'vitest';

import {metadata} from './layout';

describe('Wichteln metadata', () => {
    test('the client page still gets its own title and canonical', () => {
        // The page is a client component and cannot export metadata itself.
        expect(metadata.title).toBe('Wichteln');
        expect(metadata.alternates?.canonical).toContain('/apps/wichteln');
        expect(metadata.openGraph).toMatchObject({siteName: 'Mindestens 10 Zeichen'});
        expect(metadata.openGraph).toHaveProperty('locale');
    });
});
