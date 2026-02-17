import {
    type M12GLeaderboardEntry,
    type M12GMonthParticipation,
    type M12GMonthWithWinner,
    type M12GStats,
    type M12GWinnerEntry,
} from './types';

const MAX_LEADERBOARD_ENTRIES = 10;

export function computeM12GStats(months: M12GMonthWithWinner[]): M12GStats {
    const chronological = [...months].sort((a, b) => a.month.localeCompare(b.month));

    const gameMap = new Map<string, {link: string; totalVotes: number; monthsNominated: number; wins: number}>();

    let totalVotes = 0;

    const monthlyParticipation: M12GMonthParticipation[] = [];
    const winnerTimeline: M12GWinnerEntry[] = [];

    for (const month of chronological) {
        let monthVotes = 0;

        for (const game of month.games) {
            monthVotes += game.votes;

            const existing = gameMap.get(game.name);
            if (existing) {
                existing.totalVotes += game.votes;
                existing.monthsNominated += 1;
            } else {
                gameMap.set(game.name, {
                    link: game.link,
                    totalVotes: game.votes,
                    monthsNominated: 1,
                    wins: 0,
                });
            }
        }

        if (month.winner) {
            const entry = gameMap.get(month.winner.name);
            if (entry) {
                entry.wins += 1;
            }

            winnerTimeline.push({
                month: month.month,
                gameName: month.winner.name,
                gameLink: month.winner.link,
                votes: month.winner.votes,
            });
        }

        totalVotes += monthVotes;

        monthlyParticipation.push({
            month: month.month,
            totalVotes: monthVotes,
            gameCount: month.games.length,
        });
    }

    const leaderboard: M12GLeaderboardEntry[] = [...gameMap.entries()]
        .map(([name, data]) => ({
            name,
            link: data.link,
            totalVotes: data.totalVotes,
            monthsNominated: data.monthsNominated,
            wins: data.wins,
        }))
        .sort((a, b) => b.totalVotes - a.totalVotes || b.monthsNominated - a.monthsNominated)
        .slice(0, MAX_LEADERBOARD_ENTRIES);

    const totalMonths = chronological.length;

    return {
        totalMonths,
        totalUniqueGames: gameMap.size,
        totalVotes,
        avgVotesPerMonth: totalMonths > 0 ? Math.round(totalVotes / totalMonths) : 0,
        leaderboard,
        winnerTimeline,
        monthlyParticipation,
    };
}
