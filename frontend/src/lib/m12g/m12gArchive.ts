import {cache} from 'react';

import {buildGameHistory, type GameHistory} from './gameHistory';
import {loadMonths} from './loadMonths';
import {withTitleDefenders} from './m12gData';
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

// Pure: any-order Months → the canonical Archive (sorted, title-defenders marked,
// Game histories built). The single place that owns M12G aggregation.
export function buildArchive(months: M12GMonthWithWinner[]): M12GArchive {
    const enriched = withTitleDefenders(months);
    return {months: enriched, gameHistory: buildGameHistory(enriched)};
}

export async function loadArchive(source: MonthSource): Promise<M12GArchive> {
    return buildArchive(await source());
}

// Request-scoped: load + sort + enrich + aggregate the Months exactly once per
// render, regardless of how many projections (stats, streaks, game index, …) read it.
export const getM12GArchive = cache((): Promise<M12GArchive> => loadArchive(loadMonths));
