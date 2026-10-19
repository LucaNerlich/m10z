import {describe, expect, test} from 'vitest';

import {isValidBaseDomain} from './envChecks';

describe('isValidBaseDomain', () => {
    test('accepts an absolute http(s) origin', () => {
        expect(isValidBaseDomain('https://cms.m10z.de')).toBe(true);
        expect(isValidBaseDomain('http://localhost:1337')).toBe(true);
    });

    test('rejects a bare host, a path, and a missing scheme', () => {
        expect(isValidBaseDomain('localhost:1337')).toBe(false);
        expect(isValidBaseDomain('cms.m10z.de')).toBe(false);
        expect(isValidBaseDomain('https://cms.m10z.de/')).toBe(false);
        expect(isValidBaseDomain('https://cms.m10z.de/uploads')).toBe(false);
        expect(isValidBaseDomain('')).toBe(false);
        expect(isValidBaseDomain(undefined)).toBe(false);
    });
});
