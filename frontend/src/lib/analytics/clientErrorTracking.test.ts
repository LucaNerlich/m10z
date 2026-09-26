import {afterEach, describe, expect, test, vi} from 'vitest';

import {buildClientErrorEventData, CLIENT_ERROR_EVENT, trackClientError} from './clientErrorTracking';

const context = {source: 'error-boundary', reloaded: false, staleChunk: false};

describe('buildClientErrorEventData', () => {
    test('includes source, path, message and flags', () => {
        expect(buildClientErrorEventData(new Error('boom'), context, '/artikel/foo')).toEqual({
            source: 'error-boundary',
            path: '/artikel/foo',
            message: 'boom',
            staleChunk: false,
            reloaded: false,
        });
    });

    test('adds the server digest when present', () => {
        const error = Object.assign(new Error('An error occurred in the Server Components render.'), {
            digest: '1234567',
        });
        expect(buildClientErrorEventData(error, context, '/').digest).toBe('1234567');
    });

    test('truncates long messages', () => {
        const data = buildClientErrorEventData(new Error('x'.repeat(500)), context, '/');
        expect(String(data.message)).toHaveLength(200);
    });
});

describe('trackClientError', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('is a no-op on the server', () => {
        expect(() => trackClientError(new Error('boom'), context)).not.toThrow();
    });

    test('is a no-op when Umami is not loaded', () => {
        vi.stubGlobal('window', {location: {pathname: '/'}});
        expect(() => trackClientError(new Error('boom'), context)).not.toThrow();
    });

    test('sends a client-error event to Umami', () => {
        const track = vi.fn();
        vi.stubGlobal('window', {location: {pathname: '/podcasts/foo'}, umami: {track}});
        trackClientError(new Error('boom'), {...context, staleChunk: true, reloaded: true});
        expect(track).toHaveBeenCalledWith(CLIENT_ERROR_EVENT, expect.objectContaining({
            path: '/podcasts/foo',
            message: 'boom',
            staleChunk: true,
            reloaded: true,
        }));
    });

    test('swallows tracker failures', () => {
        const track = vi.fn(() => {
            throw new Error('tracker broken');
        });
        vi.stubGlobal('window', {location: {pathname: '/'}, umami: {track}});
        expect(() => trackClientError(new Error('boom'), context)).not.toThrow();
    });
});
