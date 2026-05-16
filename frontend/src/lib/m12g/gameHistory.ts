import {
    type M12GGameIndexEntry,
    type M12GLeaderboardEntry,
    type M12GMonthWithWinner,
} from './types';

// Aggregated record of one Game across every Month it appeared in.
// Canonical name (post Early-Access strip) is the identity — see CONTEXT.md.
export type GameHistory = {
    name: string;
    link: string;
    totalVotes: number;
    monthsNominated: number;
    wins: number;
    months: string[];
};

// Single chronological walk over months → one GameHistory per canonical game name.
// First-seen link wins (earliest chronological appearance), matching prior behaviour.
export function buildGameHistory(months: M12GMonthWithWinner[]): GameHistory[] {
    const chronological = [...months].sort((a, b) => a.month.localeCompare(b.month));
    const byName = new Map<string, GameHistory>();

    for (const month of chronological) {
        for (const game of month.games) {
            const existing = byName.get(game.name);
            if (existing) {
                existing.totalVotes += game.votes;
                existing.monthsNominated += 1;
                existing.months.push(month.month);
            } else {
                byName.set(game.name, {
                    name: game.name,
                    link: game.link,
                    totalVotes: game.votes,
                    monthsNominated: 1,
                    wins: 0,
                    months: [month.month],
                });
            }
        }
        for (const winner of month.winners) {
            const entry = byName.get(winner.name);
            if (entry) {
                entry.wins += 1;
            }
        }
    }

    return [...byName.values()];
}

export function toLeaderboard(history: GameHistory[], limit: number): M12GLeaderboardEntry[] {
    return [...history]
        .sort((a, b) => b.totalVotes - a.totalVotes || b.monthsNominated - a.monthsNominated)
        .slice(0, limit)
        .map(({months: _months, ...entry}) => entry);
}

export function toGameIndex(history: GameHistory[]): M12GGameIndexEntry[] {
    return [...history].sort((a, b) => a.name.localeCompare(b.name, 'de-DE'));
}
