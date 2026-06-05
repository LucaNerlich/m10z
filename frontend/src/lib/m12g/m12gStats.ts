import {toLeaderboard} from './gameHistory';
import {type M12GArchive} from './m12gArchive';
import {
    type M12GMonthParticipation,
    type M12GMonthWithWinner,
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
