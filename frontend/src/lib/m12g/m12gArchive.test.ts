import {describe, expect, test} from 'vitest';

import {game, month} from './m12gFixtures';
import {buildArchive, loadArchive, type MonthSource} from './m12gArchive';
import {type M12GMonthWithWinner} from './types';

// In-memory MonthSource adapter — the test-side counterpart to the filesystem reader.
function fromMonths(months: M12GMonthWithWinner[]): MonthSource {
    return async () => months;
}

describe('buildArchive', () => {
    test('orders Months chronologically regardless of input order', () => {
        const archive = buildArchive([month('2025-03', [game('A', 1)]), month('2025-01', [game('A', 1)])]);
        expect(archive.months.map((m) => m.month)).toEqual(['2025-01', '2025-03']);
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

    test('does not mutate the input months', () => {
        const months = [month('2025-02', [game('A', 1)]), month('2025-01', [game('A', 1)])];
        for (const m of months) {
            Object.freeze(m);
            Object.freeze(m.games);
            Object.freeze(m.titleDefenders);
        }
        expect(() => buildArchive(months)).not.toThrow();
    });
});

// Title defenders are an Archive concern (they depend on the previous Month's Winners),
// so they are exercised through buildArchive rather than a standalone helper.
describe('buildArchive title defenders', () => {
    function defendersFor(months: M12GMonthWithWinner[], monthId: string): string[] {
        return buildArchive(months).months.find((m) => m.month === monthId)!.titleDefenders;
    }

    test('the earliest Month has no defenders', () => {
        const months = [month('2025-01', [game('A', 1)]), month('2025-02', [game('A', 1)])];
        expect(defendersFor(months, '2025-01')).toEqual([]);
    });

    test('marks a defender when a previous Winner is nominated again', () => {
        const months = [
            month('2025-01', [game('A', 5)]), // A wins
            month('2025-02', [game('A', 1), game('B', 2)]), // B wins, A defends
        ];
        expect(defendersFor(months, '2025-02')).toEqual(['A']);
    });

    test('no defenders when the previous Winner is not nominated again', () => {
        const months = [month('2025-01', [game('A', 1)]), month('2025-02', [game('B', 1)])];
        expect(defendersFor(months, '2025-02')).toEqual([]);
    });

    test('no defenders when the previous Month had no Winner (all-zero votes)', () => {
        const months = [month('2025-01', [game('A', 0)]), month('2025-02', [game('A', 1)])];
        expect(defendersFor(months, '2025-02')).toEqual([]);
    });

    test('input order does not affect which defenders are marked', () => {
        const months = [
            month('2025-01', [game('A', 1)]),
            month('2025-02', [game('A', 1), game('B', 2)]),
            month('2025-03', [game('B', 1)]),
        ];
        const ascending = buildArchive([...months]);
        const descending = buildArchive([...months].reverse());
        const byMonth = (a: ReturnType<typeof buildArchive>) =>
            new Map(a.months.map((m) => [m.month, m.titleDefenders]));
        expect(byMonth(ascending).get('2025-03')).toEqual(byMonth(descending).get('2025-03'));
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
