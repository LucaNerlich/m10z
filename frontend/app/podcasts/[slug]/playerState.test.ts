import {describe, expect, test} from 'vitest';

import {initialPlayerPhase, playerReducer, type PlayerEvent, type PlayerPhase} from './playerState';

function apply(phase: PlayerPhase, event: PlayerEvent): PlayerPhase {
    return playerReducer(phase, event);
}

describe('initialPlayerPhase', () => {
    test('boots immediately when the embed global already exists', () => {
        expect(initialPlayerPhase(true)).toBe('booting');
    });

    test('waits for the script on a cold load', () => {
        expect(initialPlayerPhase(false)).toBe('waiting-for-script');
    });
});

describe('playerReducer', () => {
    test('a loaded script starts the embed', () => {
        expect(apply('waiting-for-script', {type: 'embed-loaded'})).toBe('booting');
    });

    test('a ready script without the embed global falls back instead of hanging', () => {
        expect(apply('waiting-for-script', {type: 'embed-missing'})).toBe('fallback');
    });

    test('a script load failure falls back', () => {
        expect(apply('waiting-for-script', {type: 'player-failed'})).toBe('fallback');
    });

    test('a resolved bootstrap becomes ready', () => {
        expect(apply('booting', {type: 'player-ready'})).toBe('ready');
    });

    test('a rejected bootstrap falls back', () => {
        expect(apply('booting', {type: 'player-failed'})).toBe('fallback');
    });

    test('a late failure cannot leave the ready player', () => {
        expect(apply('ready', {type: 'player-failed'})).toBe('ready');
    });

    test('a late script event cannot restart a mounted player', () => {
        expect(apply('ready', {type: 'embed-loaded'})).toBe('ready');
    });

    test('reset returns to the correct first phase', () => {
        expect(apply('ready', {type: 'reset', hasEmbed: true})).toBe('booting');
        expect(apply('ready', {type: 'reset', hasEmbed: false})).toBe('waiting-for-script');
    });
});
