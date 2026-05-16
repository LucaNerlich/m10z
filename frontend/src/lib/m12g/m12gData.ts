import {loadMonths} from './loadMonths';
import {type M12GMonthWithWinner, type M12GOverview} from './types';

// Marks games that won the previous Month and were nominated again this Month.
// Pure projection — does not mutate inputs.
export function withTitleDefenders(months: M12GMonthWithWinner[]): M12GMonthWithWinner[] {
    const chronological = [...months].sort((a, b) => a.month.localeCompare(b.month));
    const previousWinnersByMonth = new Map<string, Set<string>>();
    for (let i = 0; i < chronological.length; i++) {
        const previous = chronological[i - 1];
        if (!previous) continue;
        previousWinnersByMonth.set(chronological[i].month, new Set(previous.winners.map((w) => w.name)));
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

export async function fetchM12GOverview(): Promise<M12GOverview> {
    const months = await loadMonths();
    const enriched = withTitleDefenders(months);
    enriched.sort((a, b) => b.month.localeCompare(a.month));
    return {months: enriched};
}
