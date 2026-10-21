import {describe, expect, test} from 'vitest';

import {isValidBaseDomain} from './envChecks';

describe('isValidBaseDomain', () => {
    test('accepts an absolute http(s) origin', () => {
        expect(isValidBaseDomain('https://cms.m10z.de')).toBe(true);
        expect(isValidBaseDomain('http://localhost:1337')).toBe(true);
        expect(isValidBaseDomain('https://cms.m10z.de/')).toBe(true);
    });

    test('accepts a default port and any casing of an otherwise valid origin', () => {
        // URL.origin normalizes both; comparing raw strings used to reject them.
        expect(isValidBaseDomain('https://cms.m10z.de:443')).toBe(true);
        expect(isValidBaseDomain('HTTPS://CMS.M10Z.DE')).toBe(true);
        expect(isValidBaseDomain('http://localhost:1337')).toBe(true);
    });

    test('rejects a bare host, a path, and a missing scheme', () => {
        expect(isValidBaseDomain('localhost:1337')).toBe(false);
        expect(isValidBaseDomain('cms.m10z.de')).toBe(false);
        expect(isValidBaseDomain('https://cms.m10z.de/uploads')).toBe(false);
        expect(isValidBaseDomain('')).toBe(false);
        expect(isValidBaseDomain(undefined)).toBe(false);
    });

    test('rejects a query, fragment, trailing space, or userinfo', () => {
        // Each parses as a URL but would still yield a broken
        // `${BASE_DOMAIN}/uploads/...` cover URL.
        expect(isValidBaseDomain('https://cms.m10z.de?x=1')).toBe(false);
        expect(isValidBaseDomain('https://cms.m10z.de#frag')).toBe(false);
        expect(isValidBaseDomain('https://cms.m10z.de ')).toBe(false);
        expect(isValidBaseDomain('https://user:pass@cms.m10z.de')).toBe(false);
    });
});
