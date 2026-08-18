import {describe, expect, test} from 'vitest';

import {getErrorMessage, isNotFoundError, isStaleChunkError, isTimeoutOrSocketError} from './errors';

describe('getErrorMessage', () => {
    test('Error instance → message', () => {
        expect(getErrorMessage(new Error('boom'))).toBe('boom');
    });

    test('string → string', () => {
        expect(getErrorMessage('plain')).toBe('plain');
    });

    test('object with message property', () => {
        expect(getErrorMessage({message: 'object'})).toBe('object');
    });

    test('object without message → stringified', () => {
        expect(getErrorMessage({foo: 'bar'})).toBe('[object Object]');
    });

    test('null → "Unknown error"', () => {
        expect(getErrorMessage(null)).toBe('Unknown error');
    });

    test('undefined → "Unknown error"', () => {
        expect(getErrorMessage(undefined)).toBe('Unknown error');
    });

    test('number → stringified', () => {
        expect(getErrorMessage(42)).toBe('42');
    });
});

describe('isTimeoutOrSocketError', () => {
    test.each([
        ['Request timeout exceeded', true],
        ['UND_ERR_SOCKET: socket disconnected', true],
        ['fetch failed: ECONNRESET', true],
        ['ECONNREFUSED 127.0.0.1:1337', true],
        ['Connection error', true],
        ['TIMEOUT', true],
        ['Some random error', false],
        ['404 not found', false],
        ['SyntaxError: Unexpected token', false],
    ])('"%s" → %s', (msg, expected) => {
        expect(isTimeoutOrSocketError(new Error(msg))).toBe(expected);
    });

    test('handles non-Error inputs through getErrorMessage', () => {
        expect(isTimeoutOrSocketError('timeout')).toBe(true);
        expect(isTimeoutOrSocketError(null)).toBe(false);
    });
});

describe('isNotFoundError', () => {
    test.each([
        ['Strapi request failed: 404 Not Found', true],
        ['Resource not found', true],
        ['RESOURCE NOT FOUND', true],
        ['Strapi request failed: 500 Internal Server Error', false],
        ['ECONNREFUSED 127.0.0.1:1337', false],
    ])('"%s" → %s', (msg, expected) => {
        expect(isNotFoundError(new Error(msg))).toBe(expected);
    });
});

describe('isStaleChunkError', () => {
    test.each([
        ['Loading chunk 42 failed', true],
        ['ChunkLoadError: Loading chunk 3 failed', true],
        [
            'Module 81123 was instantiated because it was required from module 63859, but the module factory is not available',
            true,
        ],
        ['Failed to fetch dynamically imported module: https://example.com/chunk.js', true],
        ['Strapi request failed: 500 Internal Server Error', false],
        ['404 not found', false],
    ])('"%s" → %s', (msg, expected) => {
        expect(isStaleChunkError(new Error(msg))).toBe(expected);
    });
});
