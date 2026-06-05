import {describe, expect, test} from 'vitest';

import {buildArchive, loadArchive, type MonthSource} from './m12gArchive';
import {type M12GGame, type M12GMonthWithWinner} from './types';

function game(name: string, votes: number): M12GGame {
    return {name, link: `https://${name.toLowerCase()}.example`, votes};
}

function month(id: string, games: M12GGame[]): M12GMonthWithWinner {
    const max = games.length === 0 ? 0 : Math.max(...games.map((g) => g.votes));
    const winners = max > 0 ? games.filter((g) => g.votes === max) : [];
    return {month: id, title: `M ${id}`, forumThreadUrl: 'https://forum.example', games, winners, titleDefenders: []};
}

// In-memory MonthSource adapter — the test-side counterpart to the filesystem reader.
function fromMonths(months: M12GMonthWithWinner[]): MonthSource {
    return async () => months;
}

describe('buildArchive', () => {
    test('orders Months chronologically regardless of input order', () => {
        const archive = buildArchive([month('2025-03', [game('A', 1)]), month('2025-01', [game('A', 1)])]);
        expect(archive.months.map((m) => m.month)).toEqual(['2025-01', '2025-03']);
    });

    test('marks title defenders during the build', () => {
        const archive = buildArchive([
            month('2025-01', [game('A', 5)]), // A wins
            month('2025-02', [game('A', 2), game('B', 9)]), // A defends, B wins
        ]);
        const feb = archive.months.find((m) => m.month === '2025-02')!;
        expect(feb.titleDefenders).toEqual(['A']);
    });

    test('builds one Game history per canonical game name', () => {
        const archive = buildArchive([
            month('2025-01', [game('A', 3), game('B', 1)]),
            month('2025-02', [game('A', 5)]),
        ]);
        const a = archive.gameHistory.find((g) => g.name === 'A')!;
        expect(a).toMatchObject({totalVotes: 8, monthsNominated: 2});
        expect(a.appearances.map((ap) => ap.month)).toEqual(['2025-01', '2025-02']);
    });
});

describe('loadArchive', () => {
    test('runs the full pipeline over an in-memory source', async () => {
        const archive = await loadArchive(
            fromMonths([month('2025-02', [game('A', 4)]), month('2025-01', [game('A', 1), game('B', 2)])]),
        );
        expect(archive.months.map((m) => m.month)).toEqual(['2025-01', '2025-02']);
        expect(archive.gameHistory.map((g) => g.name).sort()).toEqual(['A', 'B']);
    });

    test('empty source yields an empty archive', async () => {
        const archive = await loadArchive(fromMonths([]));
        expect(archive).toEqual({months: [], gameHistory: []});
    });
});
