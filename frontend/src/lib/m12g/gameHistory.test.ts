import {describe, expect, test} from 'vitest';

import {
    buildGameHistory,
    computeStreaks,
    gameSlug,
    toGameIndex,
    toLeaderboard,
} from './gameHistory';
import {type M12GGame, type M12GMonthWithWinner} from './types';

function game(name: string, votes: number, link = `https://${name.toLowerCase()}.example`): M12GGame {
    return {name, link, votes};
}

function month(
    id: string,
    games: M12GGame[],
    winners: M12GGame[] = games.filter((g) => g.votes === Math.max(...games.map((x) => x.votes)) && g.votes > 0),
): M12GMonthWithWinner {
    return {
        month: id,
        title: `M ${id}`,
        forumThreadUrl: 'https://forum.example',
        games,
        winners,
        titleDefenders: [],
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
    test('aggregates votes, monthsNominated, and months chronologically', () => {
        const m1 = month('2025-01', [game('A', 3), game('B', 1)]);
        const m2 = month('2025-02', [game('A', 5), game('C', 2)]);
        const m3 = month('2025-03', [game('B', 4)]);

        const history = buildGameHistory([m3, m1, m2]);
        const byName = new Map(history.map((h) => [h.name, h]));

        expect(byName.get('A')).toMatchObject({totalVotes: 8, monthsNominated: 2, months: ['2025-01', '2025-02']});
        expect(byName.get('B')).toMatchObject({totalVotes: 5, monthsNominated: 2, months: ['2025-01', '2025-03']});
        expect(byName.get('C')).toMatchObject({totalVotes: 2, monthsNominated: 1, months: ['2025-02']});
    });

    test('first-seen link wins (earliest chronological appearance)', () => {
        const m1 = month('2025-01', [game('A', 3, 'https://old.example')]);
        const m2 = month('2025-02', [game('A', 5, 'https://new.example')]);

        const history = buildGameHistory([m2, m1]);
        expect(history[0].link).toBe('https://old.example');
    });

    test('every entry has a slug', () => {
        const m1 = month('2025-01', [game('Planet of Lana II', 1), game('Cairn', 1)]);
        const history = buildGameHistory([m1]);
        const byName = new Map(history.map((h) => [h.name, h.slug]));
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

        const history = buildGameHistory([m1, m2, m3]);
        expect(history[0]).toMatchObject({wins: 2, monthsNominated: 3});
    });

    test('handles empty months array', () => {
        expect(buildGameHistory([])).toEqual([]);
    });
});

describe('toLeaderboard', () => {
    test('sorts by totalVotes desc, then monthsNominated desc', () => {
        const history = [
            {name: 'A', slug: 'a', link: 'a', totalVotes: 10, monthsNominated: 1, wins: 0, months: []},
            {name: 'B', slug: 'b', link: 'b', totalVotes: 10, monthsNominated: 3, wins: 0, months: []},
            {name: 'C', slug: 'c', link: 'c', totalVotes: 15, monthsNominated: 1, wins: 0, months: []},
        ];
        const result = toLeaderboard(history, 10);
        expect(result.map((e) => e.name)).toEqual(['C', 'B', 'A']);
    });

    test('respects limit', () => {
        const history = Array.from({length: 20}, (_, i) => ({
            name: `G${i}`,
            slug: `g${i}`,
            link: '',
            totalVotes: 100 - i,
            monthsNominated: 1,
            wins: 0,
            months: [],
        }));
        expect(toLeaderboard(history, 5)).toHaveLength(5);
    });

    test('preserves slug and strips months field', () => {
        const history = [{name: 'A', slug: 'a', link: 'a', totalVotes: 1, monthsNominated: 1, wins: 0, months: ['2025-01']}];
        const result = toLeaderboard(history, 10);
        expect(result[0].slug).toBe('a');
        expect('months' in result[0]).toBe(false);
    });
});

describe('toGameIndex', () => {
    test('sorts alphabetically with German locale (umlauts grouped)', () => {
        const history = [
            {name: 'Zebra', slug: 'zebra', link: '', totalVotes: 1, monthsNominated: 1, wins: 0, months: []},
            {name: 'Ärger', slug: 'arger', link: '', totalVotes: 1, monthsNominated: 1, wins: 0, months: []},
            {name: 'Banane', slug: 'banane', link: '', totalVotes: 1, monthsNominated: 1, wins: 0, months: []},
            {name: 'Über', slug: 'uber', link: '', totalVotes: 1, monthsNominated: 1, wins: 0, months: []},
        ];
        const result = toGameIndex(history);
        expect(result.map((g) => g.name)).toEqual(['Ärger', 'Banane', 'Über', 'Zebra']);
    });

    test('preserves slug and months fields', () => {
        const history = [{name: 'A', slug: 'a', link: '', totalVotes: 1, monthsNominated: 2, wins: 0, months: ['2025-01', '2025-02']}];
        const result = toGameIndex(history);
        expect(result[0].slug).toBe('a');
        expect(result[0].months).toEqual(['2025-01', '2025-02']);
    });
});

describe('computeStreaks', () => {
    test('no streak when no game appears in consecutive months', () => {
        const months = [
            month('2025-01', [game('A', 1)]),
            month('2025-03', [game('A', 1)]), // gap
        ];
        const result = computeStreaks(months);
        expect(result.nomination).toBeNull();
        expect(result.win).toBeNull();
    });

    test('detects a 3-month nomination streak', () => {
        const months = [
            month('2025-01', [game('A', 1), game('B', 5)]),
            month('2025-02', [game('A', 1)]),
            month('2025-03', [game('A', 1)]),
        ];
        const result = computeStreaks(months);
        expect(result.nomination).toMatchObject({
            name: 'A',
            slug: 'a',
            length: 3,
            months: ['2025-01', '2025-02', '2025-03'],
        });
    });

    test('detects a 2-month win streak', () => {
        const months = [
            month('2025-01', [game('A', 5)]),
            month('2025-02', [game('A', 5)]),
            month('2025-03', [game('B', 5)]),
        ];
        const result = computeStreaks(months);
        expect(result.win).toMatchObject({name: 'A', length: 2});
    });

    test('handles year boundary (2024-12 → 2025-01 are consecutive)', () => {
        const months = [
            month('2024-12', [game('A', 1)]),
            month('2025-01', [game('A', 1)]),
        ];
        const result = computeStreaks(months);
        expect(result.nomination).toMatchObject({name: 'A', length: 2});
    });

    test('picks the longer of two competing streaks', () => {
        const months = [
            month('2025-01', [game('A', 1), game('B', 1)]),
            month('2025-02', [game('A', 1), game('B', 1)]),
            month('2025-03', [game('B', 1)]),
        ];
        const result = computeStreaks(months);
        expect(result.nomination).toMatchObject({name: 'B', length: 3});
    });

    test('empty months → no streaks', () => {
        expect(computeStreaks([])).toEqual({nomination: null, win: null});
    });
});
