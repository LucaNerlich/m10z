import {describe, expect, test} from 'vitest';

import {buildGameHistory, toGameIndex, toLeaderboard} from './gameHistory';
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

describe('buildGameHistory', () => {
    test('aggregates votes, monthsNominated, and months chronologically', () => {
        const m1 = month('2025-01', [game('A', 3), game('B', 1)]);
        const m2 = month('2025-02', [game('A', 5), game('C', 2)]);
        const m3 = month('2025-03', [game('B', 4)]);

        const history = buildGameHistory([m3, m1, m2]); // input order intentionally scrambled
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

    test('wins increment per win, not per nomination', () => {
        const a1 = game('A', 5);
        const a2 = game('A', 3);
        const a3 = game('A', 7);
        const m1 = month('2025-01', [a1], [a1]); // A wins
        const m2 = month('2025-02', [a2], []);   // A nominated, doesn't win
        const m3 = month('2025-03', [a3], [a3]); // A wins again

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
            {name: 'A', link: 'a', totalVotes: 10, monthsNominated: 1, wins: 0, months: []},
            {name: 'B', link: 'b', totalVotes: 10, monthsNominated: 3, wins: 0, months: []},
            {name: 'C', link: 'c', totalVotes: 15, monthsNominated: 1, wins: 0, months: []},
        ];
        const result = toLeaderboard(history, 10);
        expect(result.map((e) => e.name)).toEqual(['C', 'B', 'A']);
    });

    test('respects limit', () => {
        const history = Array.from({length: 20}, (_, i) => ({
            name: `G${i}`,
            link: '',
            totalVotes: 100 - i,
            monthsNominated: 1,
            wins: 0,
            months: [],
        }));
        expect(toLeaderboard(history, 5)).toHaveLength(5);
    });

    test('strips months field from output', () => {
        const history = [{name: 'A', link: 'a', totalVotes: 1, monthsNominated: 1, wins: 0, months: ['2025-01']}];
        const result = toLeaderboard(history, 10);
        expect('months' in result[0]).toBe(false);
    });
});

describe('toGameIndex', () => {
    test('sorts alphabetically with German locale (umlauts before z)', () => {
        const history = [
            {name: 'Zebra', link: '', totalVotes: 1, monthsNominated: 1, wins: 0, months: []},
            {name: 'Ärger', link: '', totalVotes: 1, monthsNominated: 1, wins: 0, months: []},
            {name: 'Banane', link: '', totalVotes: 1, monthsNominated: 1, wins: 0, months: []},
            {name: 'Über', link: '', totalVotes: 1, monthsNominated: 1, wins: 0, months: []},
        ];
        const result = toGameIndex(history);
        // German locale: Ä sorts with A, Ü sorts with U → "Ä, B, Ü, Z"
        expect(result.map((g) => g.name)).toEqual(['Ärger', 'Banane', 'Über', 'Zebra']);
    });

    test('preserves months field', () => {
        const history = [{name: 'A', link: '', totalVotes: 1, monthsNominated: 2, wins: 0, months: ['2025-01', '2025-02']}];
        const result = toGameIndex(history);
        expect(result[0].months).toEqual(['2025-01', '2025-02']);
    });
});
