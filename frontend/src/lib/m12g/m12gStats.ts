import {computeStreaks, type GameHistory, gameSlug, type StreaksResult, toLeaderboard} from './gameHistory';
import {type M12GArchive} from './m12gArchive';
import {
    type M12GMonthParticipation,
    type M12GMonthWithWinner,
    type M12GRecords,
    type M12GStats,
    type M12GWinnerEntry,
} from './types';

const MAX_LEADERBOARD_ENTRIES = 10;

function toMonthlyParticipation(months: M12GMonthWithWinner[]): M12GMonthParticipation[] {
    return months.map((month) => ({
        month: month.month,
        totalVotes: month.games.reduce((sum, g) => sum + g.votes, 0),
        gameCount: month.games.length,
    }));
}

function toWinnerTimeline(months: M12GMonthWithWinner[]): M12GWinnerEntry[] {
    return months.flatMap((month) =>
        month.winners.map((winner) => ({
            month: month.month,
            gameName: winner.name,
            slug: gameSlug(winner.name),
            gameLink: winner.link,
            votes: winner.votes,
        })),
    );
}

// Pure projection of the Archive — months are already chronological and the Game
// histories are already built, so this neither re-sorts nor re-aggregates.
export function computeM12GStats(archive: M12GArchive): M12GStats {
    const {months, gameHistory} = archive;
    const monthlyParticipation = toMonthlyParticipation(months);
    const totalVotes = monthlyParticipation.reduce((sum, m) => sum + m.totalVotes, 0);
    const totalMonths = months.length;

    return {
        totalMonths,
        totalUniqueGames: gameHistory.length,
        totalVotes,
        avgVotesPerMonth: totalMonths > 0 ? Math.round(totalVotes / totalMonths) : 0,
        leaderboard: toLeaderboard(gameHistory, MAX_LEADERBOARD_ENTRIES),
        winnerTimeline: toWinnerTimeline(months),
        monthlyParticipation,
    };
}

// First element with the highest score; inputs are chronological, so ties go to the earliest Month.
function maxBy<T>(items: T[], score: (item: T) => number): T | null {
    let best: T | null = null;
    for (const item of items) {
        if (best === null || score(item) > score(best)) best = item;
    }
    return best;
}

function toMostWins(history: GameHistory[]): M12GRecords['mostWins'] {
    const best = [...history]
        .filter((game) => game.wins >= 2)
        .sort((a, b) => b.wins - a.wins || b.totalVotes - a.totalVotes || a.name.localeCompare(b.name, 'de'))[0];
    return best ? {name: best.name, slug: best.slug, wins: best.wins} : null;
}

function toClosestRace(months: M12GMonthWithWinner[]): M12GRecords['closestRace'] {
    const races = months
        .filter((month) => month.winners.length > 0 && month.games.length > 1)
        .map((month) => {
            const winnerVotes = month.winners[0].votes;
            const runnerUp = Math.max(0, ...month.games.filter((g) => g.votes < winnerVotes).map((g) => g.votes));
            return {
                month: month.month,
                margin: month.winners.length > 1 ? 0 : winnerVotes - runnerUp,
                winnerCount: month.winners.length,
            };
        });
    return maxBy(races, (race) => -race.margin);
}

export function computeM12GRecords(stats: M12GStats, archive: M12GArchive): M12GRecords {
    const busiest = maxBy(stats.monthlyParticipation, (m) => m.totalVotes);
    const strongest = maxBy(stats.winnerTimeline, (w) => w.votes);

    return {
        busiestMonth: busiest ? {month: busiest.month, totalVotes: busiest.totalVotes} : null,
        closestRace: toClosestRace(archive.months),
        strongestWin: strongest
            ? {month: strongest.month, gameName: strongest.gameName, slug: strongest.slug, votes: strongest.votes}
            : null,
        mostWins: toMostWins(archive.gameHistory),
    };
}

// Everything the M12G overview page renders, assembled once from the Archive. The page
// reads this single projection instead of composing stats, streaks, and month ordering
// itself — keeping the view-model in the domain, not the route component.
export type M12GOverview = {
    stats: M12GStats;
    records: M12GRecords;
    streaks: StreaksResult;
    monthsNewestFirst: M12GMonthWithWinner[];
};

export function buildM12GOverview(archive: M12GArchive): M12GOverview {
    const stats = computeM12GStats(archive);
    return {
        stats,
        records: computeM12GRecords(stats, archive),
        streaks: computeStreaks(archive.gameHistory),
        monthsNewestFirst: [...archive.months].reverse(),
    };
}
