import {describe, expect, test} from 'vitest';

import {withTitleDefenders} from './m12gData';
import {type M12GGame, type M12GMonthWithWinner} from './types';

function g(name: string, votes = 1): M12GGame {
    return {name, link: `https://${name}.example`, votes};
}

function m(id: string, games: M12GGame[], winners: M12GGame[]): M12GMonthWithWinner {
    return {month: id, title: id, forumThreadUrl: 'https://x', games, winners, titleDefenders: []};
}

describe('withTitleDefenders', () => {
    test('returns empty defenders for the earliest month', () => {
        const months = [m('2025-01', [g('A')], [g('A')]), m('2025-02', [g('A')], [g('A')])];
        const result = withTitleDefenders(months);
        const jan = result.find((x) => x.month === '2025-01')!;
        expect(jan.titleDefenders).toEqual([]);
    });

    test('marks a defender when a previous winner is nominated again', () => {
        const months = [m('2025-01', [g('A')], [g('A')]), m('2025-02', [g('A'), g('B')], [g('B', 2)])];
        const result = withTitleDefenders(months);
        const feb = result.find((x) => x.month === '2025-02')!;
        expect(feb.titleDefenders).toEqual(['A']);
    });

    test('no defenders when previous winner is not nominated again', () => {
        const months = [m('2025-01', [g('A')], [g('A')]), m('2025-02', [g('B')], [g('B')])];
        const result = withTitleDefenders(months);
        const feb = result.find((x) => x.month === '2025-02')!;
        expect(feb.titleDefenders).toEqual([]);
    });

    test('no defenders when previous month has no winners (all-zero votes)', () => {
        const months = [
            m('2025-01', [g('A', 0)], []),
            m('2025-02', [g('A')], [g('A')]),
        ];
        const result = withTitleDefenders(months);
        const feb = result.find((x) => x.month === '2025-02')!;
        expect(feb.titleDefenders).toEqual([]);
    });

    test('chronological independence: input order does not affect output', () => {
        const months = [
            m('2025-01', [g('A')], [g('A')]),
            m('2025-02', [g('A'), g('B')], [g('B', 2)]),
            m('2025-03', [g('B')], [g('B')]),
        ];
        const ascending = withTitleDefenders([...months]);
        const descending = withTitleDefenders([...months].reverse());

        const aByMonth = new Map(ascending.map((x) => [x.month, x.titleDefenders]));
        const dByMonth = new Map(descending.map((x) => [x.month, x.titleDefenders]));
        expect(aByMonth.get('2025-02')).toEqual(dByMonth.get('2025-02'));
        expect(aByMonth.get('2025-03')).toEqual(dByMonth.get('2025-03'));
    });

    test('does not mutate input months or games', () => {
        const months = [
            m('2025-01', [g('A')], [g('A')]),
            m('2025-02', [g('A')], [g('A')]),
        ];
        // Deep-freeze inputs — any in-place mutation would throw in strict mode.
        for (const month of months) {
            Object.freeze(month);
            Object.freeze(month.games);
            Object.freeze(month.titleDefenders);
            for (const game of month.games) Object.freeze(game);
        }
        expect(() => withTitleDefenders(months)).not.toThrow();
    });
});
