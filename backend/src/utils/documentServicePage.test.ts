import {describe, expect, test} from 'vitest';

import {documentServicePage} from './documentServicePage';

describe('documentServicePage', () => {
    test('maps page 1 to a zero offset', () => {
        expect(documentServicePage(1, 50)).toEqual({limit: 50, start: 0});
    });

    test('maps later pages to a start offset of (page - 1) * pageSize', () => {
        expect(documentServicePage(2, 25)).toEqual({limit: 25, start: 25});
        expect(documentServicePage(3, 100)).toEqual({limit: 100, start: 200});
    });
});
