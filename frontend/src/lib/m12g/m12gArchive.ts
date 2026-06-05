import {cache} from 'react';

import {fsMonthSource} from './fsMonthSource';
import {buildGameHistory, type GameHistory} from './gameHistory';
import {type M12GMonthWithWinner} from './types';

// The finalized record of every Month plus the Game histories derived from them —
// see CONTEXT.md (Archive). Every M12G view is a pure projection of this object.
// `months` are chronological (oldest first).
export type M12GArchive = {
    months: M12GMonthWithWinner[];
    gameHistory: GameHistory[];
};

// The swappable source of Months: the filesystem in production, fixtures in tests.
export type MonthSource = () => Promise<M12GMonthWithWinner[]>;

// Marks the games that won the previous Month and were nominated again this Month.
// Assumes `chronological` is already sorted oldest-first — buildArchive owns that sort,
// so this neither re-sorts nor mutates its input.
function markTitleDefenders(chronological: M12GMonthWithWinner[]): M12GMonthWithWinner[] {
    const previousWinnersByMonth = new Map<string, Set<string>>();
    for (let i = 1; i < chronological.length; i++) {
        previousWinnersByMonth.set(
            chronological[i].month,
            new Set(chronological[i - 1].winners.map((w) => w.name)),
        );
    }

    return chronological.map((month) => {
        const previousWinners = previousWinnersByMonth.get(month.month);
        if (!previousWinners || previousWinners.size === 0) {
            return month;
        }
        const titleDefenders = month.games.filter((g) => previousWinners.has(g.name)).map((g) => g.name);
        if (titleDefenders.length === 0) {
            return month;
        }
        return {...month, titleDefenders};
    });
}

// Pure: any-order Months → the canonical Archive. The single place that owns M12G
// aggregation — it sorts the Months once (oldest first), marks title defenders, and
// builds the Game histories. Downstream projections rely on that ordering.
export function buildArchive(months: M12GMonthWithWinner[]): M12GArchive {
    const chronological = [...months].sort((a, b) => a.month.localeCompare(b.month));
    const enriched = markTitleDefenders(chronological);
    return {months: enriched, gameHistory: buildGameHistory(enriched)};
}

export async function loadArchive(source: MonthSource): Promise<M12GArchive> {
    return buildArchive(await source());
}

// Request-scoped: load + sort + enrich + aggregate the Months exactly once per
// render, regardless of how many projections (stats, streaks, game index, …) read it.
export const getM12GArchive = cache((): Promise<M12GArchive> => loadArchive(fsMonthSource));
