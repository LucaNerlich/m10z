import {describe, expect, test} from 'vitest';

import {game, month} from './m12gFixtures';
import {buildGameHistory, computeStreaks, type GameHistory, gameSlug, toGameIndex, toLeaderboard} from './gameHistory';

// Minimal GameHistory fixture for the projection functions (toLeaderboard/toGameIndex).
function history(name: string, months: string[], extra: Partial<GameHistory> = {}): GameHistory {
    return {
        name,
        slug: gameSlug(name),
        link: '',
        totalVotes: 1,
        monthsNominated: months.length,
        wins: 0,
        appearances: months.map((m) => ({month: m, votes: 1, isWinner: false})),
        ...extra,
    };
}

describe('gameSlug', () => {
    test.each([
        ['Cairn', 'cairn'],
        ['Planet of Lana II', 'planet-of-lana-ii'],
        ['Mouse: P.I. for Hire', 'mouse-p-i-for-hire'],
        ['Mumintroll: Die Wärme des Winters', 'mumintroll-die-warme-des-winters'],
        ['I Am Jesus Christ', 'i-am-jesus-christ'],
        ['REPLACED', 'replaced'],
        ['   spaces   ', 'spaces'],
        ['--leading-trailing--', 'leading-trailing'],
        ['日本語', 'unnamed'],
        ['', 'unnamed'],
    ])('"%s" → "%s"', (input, expected) => {
        expect(gameSlug(input)).toBe(expected);
    });
});

describe('buildGameHistory', () => {
    test('aggregates votes, monthsNominated, and appearances chronologically', () => {
        const m1 = month('2025-01', [game('A', 3), game('B', 1)]);
        const m2 = month('2025-02', [game('A', 5), game('C', 2)]);
        const m3 = month('2025-03', [game('B', 4)]);

        const result = buildGameHistory([m1, m2, m3]);
        const byName = new Map(result.map((h) => [h.name, h]));

        expect(byName.get('A')).toMatchObject({totalVotes: 8, monthsNominated: 2});
        expect(byName.get('A')!.appearances.map((a) => a.month)).toEqual(['2025-01', '2025-02']);
        expect(byName.get('B')).toMatchObject({totalVotes: 5, monthsNominated: 2});
        expect(byName.get('B')!.appearances.map((a) => a.month)).toEqual(['2025-01', '2025-03']);
        expect(byName.get('C')!.appearances.map((a) => a.month)).toEqual(['2025-02']);
    });

    test('appearances carry per-month votes, winner flag, and month context', () => {
        const m1 = month('2025-01', [game('A', 5), game('B', 1)]); // A wins
        const m2 = month('2025-02', [game('A', 2), game('B', 9)]); // B wins
        const result = buildGameHistory([m1, m2]);
        const a = result.find((h) => h.name === 'A')!;

        expect(a.appearances).toEqual([
            {month: '2025-01', votes: 5, isWinner: true, title: 'M 2025-01', forumThreadUrl: 'https://forum.example'},
            {month: '2025-02', votes: 2, isWinner: false, title: 'M 2025-02', forumThreadUrl: 'https://forum.example'},
        ]);
    });

    test('first-seen link wins (earliest chronological appearance)', () => {
        const m1 = month('2025-01', [game('A', 3, 'https://old.example')]);
        const m2 = month('2025-02', [game('A', 5, 'https://new.example')]);

        const result = buildGameHistory([m1, m2]);
        expect(result[0].link).toBe('https://old.example');
    });

    test('every entry has a slug', () => {
        const m1 = month('2025-01', [game('Planet of Lana II', 1), game('Cairn', 1)]);
        const result = buildGameHistory([m1]);
        const byName = new Map(result.map((h) => [h.name, h.slug]));
        expect(byName.get('Planet of Lana II')).toBe('planet-of-lana-ii');
        expect(byName.get('Cairn')).toBe('cairn');
    });

    test('wins increment per win, not per nomination', () => {
        const a1 = game('A', 5);
        const a2 = game('A', 3);
        const a3 = game('A', 7);
        const m1 = month('2025-01', [a1], [a1]);
        const m2 = month('2025-02', [a2], []);
        const m3 = month('2025-03', [a3], [a3]);

        const result = buildGameHistory([m1, m2, m3]);
        expect(result[0]).toMatchObject({wins: 2, monthsNominated: 3});
    });

    test('handles empty months array', () => {
        expect(buildGameHistory([])).toEqual([]);
    });
});

describe('toLeaderboard', () => {
    test('sorts by totalVotes desc, then monthsNominated desc', () => {
        const entries = [
            history('A', [], {totalVotes: 10, monthsNominated: 1}),
            history('B', [], {totalVotes: 10, monthsNominated: 3}),
            history('C', [], {totalVotes: 15, monthsNominated: 1}),
        ];
        const result = toLeaderboard(entries, 10);
        expect(result.map((e) => e.name)).toEqual(['C', 'B', 'A']);
    });

    test('respects limit', () => {
        const entries = Array.from({length: 20}, (_, i) =>
            history(`G${i}`, [], {totalVotes: 100 - i}),
        );
        expect(toLeaderboard(entries, 5)).toHaveLength(5);
    });

    test('preserves slug and strips the appearances field', () => {
        const result = toLeaderboard([history('A', ['2025-01'])], 10);
        expect(result[0].slug).toBe('a');
        expect('appearances' in result[0]).toBe(false);
    });
});

describe('toGameIndex', () => {
    test('sorts alphabetically with German locale (umlauts grouped)', () => {
        const entries = [history('Zebra', []), history('Ärger', []), history('Banane', []), history('Über', [])];
        const result = toGameIndex(entries);
        expect(result.map((g) => g.name)).toEqual(['Ärger', 'Banane', 'Über', 'Zebra']);
    });

    test('preserves slug and projects months from appearances', () => {
        const result = toGameIndex([history('A', ['2025-01', '2025-02'])]);
        expect(result[0].slug).toBe('a');
        expect(result[0].months).toEqual(['2025-01', '2025-02']);
        expect('appearances' in result[0]).toBe(false);
    });
});

describe('computeStreaks', () => {
    test('no streak when no game appears in consecutive months', () => {
        const result = computeStreaks(
            buildGameHistory([
                month('2025-01', [game('A', 1)]),
                month('2025-03', [game('A', 1)]), // gap
            ]),
        );
        expect(result.nomination).toBeNull();
        expect(result.win).toBeNull();
    });

    test('detects a 3-month nomination streak', () => {
        const result = computeStreaks(
            buildGameHistory([
                month('2025-01', [game('A', 1), game('B', 5)]),
                month('2025-02', [game('A', 1)]),
                month('2025-03', [game('A', 1)]),
            ]),
        );
        expect(result.nomination).toMatchObject({
            name: 'A',
            slug: 'a',
            length: 3,
            months: ['2025-01', '2025-02', '2025-03'],
        });
    });

    test('detects a 2-month win streak', () => {
        const result = computeStreaks(
            buildGameHistory([
                month('2025-01', [game('A', 5)]),
                month('2025-02', [game('A', 5)]),
                month('2025-03', [game('B', 5)]),
            ]),
        );
        expect(result.win).toMatchObject({name: 'A', length: 2});
    });

    test('handles year boundary (2024-12 → 2025-01 are consecutive)', () => {
        const result = computeStreaks(
            buildGameHistory([month('2024-12', [game('A', 1)]), month('2025-01', [game('A', 1)])]),
        );
        expect(result.nomination).toMatchObject({name: 'A', length: 2});
    });

    test('picks the longer of two competing streaks', () => {
        const result = computeStreaks(
            buildGameHistory([
                month('2025-01', [game('A', 1), game('B', 1)]),
                month('2025-02', [game('A', 1), game('B', 1)]),
                month('2025-03', [game('B', 1)]),
            ]),
        );
        expect(result.nomination).toMatchObject({name: 'B', length: 3});
    });

    test('empty history → no streaks', () => {
        expect(computeStreaks([])).toEqual({nomination: null, win: null});
    });
});
