import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {requireDiagnosticsAuth} from './requireDiagnosticsAuth';

// Real `verifySecret`, `getClientIp` and `checkRateLimit` are used on purpose;
// each test takes a unique rate-limit bucket so the shared window cannot leak
// between cases.
function req(headers: Record<string, string> = {}): Request {
    return new Request('https://m10z.de/api/diagnostics', {headers});
}

function authed(): Request {
    return req({'x-m10z-diagnostics-token': 'test-token'});
}

beforeEach(() => {
    vi.stubEnv('DIAGNOSTICS_TOKEN', 'test-token');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('requireDiagnosticsAuth', () => {
    test('allows a request with the configured token', () => {
        expect(requireDiagnosticsAuth(authed(), {bucket: 'auth-ok', max: 30})).toBeNull();
    });

    test('rejects a missing token with 401', () => {
        expect(requireDiagnosticsAuth(req(), {bucket: 'auth-missing', max: 30})?.status).toBe(401);
    });

    test('rejects a wrong token with 401', () => {
        const res = requireDiagnosticsAuth(req({'x-m10z-diagnostics-token': 'wrong'}), {
            bucket: 'auth-wrong',
            max: 30,
        });
        expect(res?.status).toBe(401);
    });

    test('rejects everything when no token is configured', () => {
        vi.stubEnv('DIAGNOSTICS_TOKEN', '');
        expect(requireDiagnosticsAuth(authed(), {bucket: 'auth-unset', max: 30})?.status).toBe(401);
    });

    test('ignores a query-string token (header-only authentication)', () => {
        const request = new Request('https://m10z.de/api/diagnostics?token=test-token');
        expect(requireDiagnosticsAuth(request, {bucket: 'auth-query', max: 30})?.status).toBe(401);
    });

    test('returns 429 with Retry-After once the bucket is exhausted, even with a valid token', () => {
        const options = {bucket: 'auth-429', max: 3};
        for (let i = 0; i < 3; i++) {
            expect(requireDiagnosticsAuth(authed(), options)).toBeNull();
        }

        const res = requireDiagnosticsAuth(authed(), options);
        expect(res?.status).toBe(429);
        expect(Number(res?.headers.get('Retry-After'))).toBeGreaterThan(0);
    });
});
