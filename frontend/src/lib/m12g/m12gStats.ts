import {buildGameHistory, toGameIndex, toLeaderboard} from './gameHistory';
import {
    type M12GGameIndexEntry,
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

export function computeM12GStats(months: M12GMonthWithWinner[]): M12GStats {
    const chronological = [...months].sort((a, b) => a.month.localeCompare(b.month));
    const history = buildGameHistory(chronological);
    const monthlyParticipation = toMonthlyParticipation(chronological);
    const totalVotes = monthlyParticipation.reduce((sum, m) => sum + m.totalVotes, 0);
    const totalMonths = chronological.length;

    return {
        totalMonths,
        totalUniqueGames: history.length,
        totalVotes,
        avgVotesPerMonth: totalMonths > 0 ? Math.round(totalVotes / totalMonths) : 0,
        leaderboard: toLeaderboard(history, MAX_LEADERBOARD_ENTRIES),
        winnerTimeline: toWinnerTimeline(chronological),
        monthlyParticipation,
    };
}

export function buildGameIndex(months: M12GMonthWithWinner[]): M12GGameIndexEntry[] {
    return toGameIndex(buildGameHistory(months));
}
