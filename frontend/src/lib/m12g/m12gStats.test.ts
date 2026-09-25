import {describe, expect, test} from 'vitest';

import {game, month} from './m12gFixtures';
import {buildArchive} from './m12gArchive';
import {buildM12GOverview, computeM12GRecords, computeM12GStats} from './m12gStats';
import {type M12GMonthWithWinner} from './types';

function stats(months: M12GMonthWithWinner[]) {
    return computeM12GStats(buildArchive(months));
}

describe('computeM12GStats', () => {
    test('returns expected scalars for a simple two-month dataset', () => {
        const result = stats([
            month('2025-01', [game('A', 3), game('B', 1)]), // 4 votes
            month('2025-02', [game('A', 5), game('C', 2)]), // 7 votes
        ]);
        expect(result.totalMonths).toBe(2);
        expect(result.totalUniqueGames).toBe(3);
        expect(result.totalVotes).toBe(11);
        expect(result.avgVotesPerMonth).toBe(6); // 11 / 2 = 5.5 → round → 6
    });

    test('totalMonths=0 keeps avgVotesPerMonth at 0', () => {
        expect(stats([])).toMatchObject({totalMonths: 0, totalVotes: 0, avgVotesPerMonth: 0});
    });

    test('leaderboard is capped at 10', () => {
        const games = Array.from({length: 20}, (_, i) => game(`G${i}`, 100 - i));
        expect(stats([month('2025-01', games)]).leaderboard).toHaveLength(10);
    });

    test('winnerTimeline is chronological and includes ties', () => {
        const m1 = month('2025-01', [game('A', 5), game('B', 5), game('C', 1)]); // A and B tied winners
        const m2 = month('2025-02', [game('D', 3)]); // D wins alone
        const result = stats([m2, m1]); // input order doesn't matter

        expect(result.winnerTimeline.map((w) => w.month)).toEqual(['2025-01', '2025-01', '2025-02']);
        expect(result.winnerTimeline.map((w) => w.gameName).sort()).toEqual(['A', 'B', 'D']);
    });

    test('winnerTimeline entries carry the Game slug', () => {
        expect(stats([month('2025-01', [game('Wärme Ära', 3)])]).winnerTimeline[0].slug).toBe('warme-ara');
    });

    test('monthlyParticipation is chronological with correct totals', () => {
        const m1 = month('2025-01', [game('A', 3), game('B', 1)]);
        const m2 = month('2025-02', [game('A', 5)]);
        expect(stats([m2, m1]).monthlyParticipation).toEqual([
            {month: '2025-01', totalVotes: 4, gameCount: 2},
            {month: '2025-02', totalVotes: 5, gameCount: 1},
        ]);
    });
});

describe('computeM12GRecords', () => {
    function records(months: M12GMonthWithWinner[]) {
        const archive = buildArchive(months);
        return computeM12GRecords(computeM12GStats(archive), archive);
    }

    test('is all null for an empty archive', () => {
        expect(records([])).toEqual({busiestMonth: null, closestRace: null, strongestWin: null, mostWins: null});
    });

    test('picks the busiest month and strongest win', () => {
        const result = records([
            month('2025-01', [game('A', 4), game('B', 1), game('C', 1)]), // 6 votes, 3 games, winner 4
            month('2025-02', [game('D', 9), game('E', 1)]), // 10 votes, 2 games, winner 9
        ]);
        expect(result.busiestMonth).toEqual({month: '2025-02', totalVotes: 10});
        expect(result.strongestWin).toEqual({month: '2025-02', gameName: 'D', slug: 'd', votes: 9});
    });

    test('ties go to the earliest month', () => {
        const result = records([
            month('2025-02', [game('B', 5)]),
            month('2025-01', [game('A', 5)]),
        ]);
        expect(result.busiestMonth?.month).toBe('2025-01');
        expect(result.strongestWin?.gameName).toBe('A');
    });

    test('closestRace is the smallest lead over the runner-up, ties count as 0', () => {
        expect(
            records([
                month('2025-01', [game('A', 9), game('B', 2)]), // lead 7
                month('2025-02', [game('C', 5), game('D', 4)]), // lead 1
            ]).closestRace
        ).toEqual({month: '2025-02', margin: 1, winnerCount: 1});

        expect(
            records([
                month('2025-01', [game('A', 5), game('B', 4)]),
                month('2025-02', [game('C', 3), game('D', 3), game('E', 1)]), // tie
            ]).closestRace
        ).toEqual({month: '2025-02', margin: 0, winnerCount: 2});
    });

    test('closestRace ignores months with a single nominee', () => {
        expect(records([month('2025-01', [game('A', 5)])]).closestRace).toBeNull();
    });

    test('mostWins needs at least two wins and breaks ties by total votes', () => {
        expect(records([month('2025-01', [game('A', 5)]), month('2025-02', [game('B', 5)])]).mostWins).toBeNull();

        const result = records([
            month('2025-01', [game('A', 5), game('B', 1)]),
            month('2025-02', [game('B', 9), game('A', 1)]),
            month('2025-03', [game('A', 2)]),
            month('2025-04', [game('B', 3)]),
        ]);
        expect(result.mostWins).toEqual({name: 'B', slug: 'b', wins: 2});
    });
});

describe('buildM12GOverview', () => {
    test('bundles stats, streaks, and newest-first Months from one Archive', () => {
        const archive = buildArchive([
            month('2025-01', [game('A', 5)]),
            month('2025-02', [game('A', 3)]), // A wins two months running
        ]);
        const overview = buildM12GOverview(archive);

        expect(overview.stats.totalMonths).toBe(2);
        expect(overview.monthsNewestFirst.map((m) => m.month)).toEqual(['2025-02', '2025-01']);
        expect(overview.streaks.win).toMatchObject({name: 'A', length: 2});
        expect(overview.records.mostWins).toEqual({name: 'A', slug: 'a', wins: 2});
    });
});
