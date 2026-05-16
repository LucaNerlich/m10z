import {describe, expect, test} from 'vitest';

import {buildGameIndex, computeM12GStats} from './m12gStats';
import {type M12GGame, type M12GMonthWithWinner} from './types';

function game(name: string, votes: number): M12GGame {
    return {name, link: `https://${name}.example`, votes};
}

function month(id: string, games: M12GGame[]): M12GMonthWithWinner {
    const max = games.length === 0 ? 0 : Math.max(...games.map((g) => g.votes));
    const winners = max > 0 ? games.filter((g) => g.votes === max) : [];
    return {month: id, title: id, forumThreadUrl: 'https://x', games, winners, titleDefenders: []};
}

describe('computeM12GStats', () => {
    test('returns expected scalars for a simple two-month dataset', () => {
        const months = [
            month('2025-01', [game('A', 3), game('B', 1)]), // 4 votes
            month('2025-02', [game('A', 5), game('C', 2)]), // 7 votes
        ];
        const stats = computeM12GStats(months);
        expect(stats.totalMonths).toBe(2);
        expect(stats.totalUniqueGames).toBe(3);
        expect(stats.totalVotes).toBe(11);
        expect(stats.avgVotesPerMonth).toBe(6); // 11 / 2 = 5.5 → round → 6
    });

    test('totalMonths=0 keeps avgVotesPerMonth at 0', () => {
        const stats = computeM12GStats([]);
        expect(stats).toMatchObject({totalMonths: 0, totalVotes: 0, avgVotesPerMonth: 0});
    });

    test('leaderboard is capped at 10', () => {
        const games = Array.from({length: 20}, (_, i) => game(`G${i}`, 100 - i));
        const stats = computeM12GStats([month('2025-01', games)]);
        expect(stats.leaderboard).toHaveLength(10);
    });

    test('winnerTimeline is chronological and includes ties', () => {
        const m1 = month('2025-01', [game('A', 5), game('B', 5), game('C', 1)]); // A and B tied winners
        const m2 = month('2025-02', [game('D', 3)]);                              // D wins alone
        const stats = computeM12GStats([m2, m1]); // input order doesn't matter

        expect(stats.winnerTimeline.map((w) => w.month)).toEqual(['2025-01', '2025-01', '2025-02']);
        expect(stats.winnerTimeline.map((w) => w.gameName).sort()).toEqual(['A', 'B', 'D']);
    });

    test('monthlyParticipation is chronological with correct totals', () => {
        const m1 = month('2025-01', [game('A', 3), game('B', 1)]);
        const m2 = month('2025-02', [game('A', 5)]);
        const stats = computeM12GStats([m2, m1]);
        expect(stats.monthlyParticipation).toEqual([
            {month: '2025-01', totalVotes: 4, gameCount: 2},
            {month: '2025-02', totalVotes: 5, gameCount: 1},
        ]);
    });
});

describe('buildGameIndex', () => {
    test('passes through gameHistory and returns all games sorted alphabetically', () => {
        const months = [
            month('2025-01', [game('Beta', 1), game('Alpha', 2)]),
            month('2025-02', [game('Alpha', 3)]),
        ];
        const index = buildGameIndex(months);
        expect(index.map((g) => g.name)).toEqual(['Alpha', 'Beta']);
        expect(index.find((g) => g.name === 'Alpha')).toMatchObject({totalVotes: 5, monthsNominated: 2});
    });
});
