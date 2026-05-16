import {
    type M12GGameIndexEntry,
    type M12GLeaderboardEntry,
    type M12GMonthWithWinner,
} from './types';

// Aggregated record of one Game across every Month it appeared in.
// Canonical name (post Early-Access strip) is the identity — see CONTEXT.md.
export type GameHistory = {
    name: string;
    slug: string;
    link: string;
    totalVotes: number;
    monthsNominated: number;
    wins: number;
    months: string[];
};

// Stable URL-safe identifier for a Game. ASCII-only via NFD strip so umlauts
// produce readable slugs ("Wärme" → "warme") without a German romanization map.
export function gameSlug(name: string): string {
    const slug = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug.length > 0 ? slug : 'unnamed';
}

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
                    slug: gameSlug(game.name),
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

export type Streak = {
    name: string;
    slug: string;
    length: number;
    months: string[];
};

export type StreaksResult = {
    nomination: Streak | null;
    win: Streak | null;
};

// Returns 1 when months is non-empty (a single appearance is a streak of length 1).
function findLongestRun(months: string[]): {length: number; months: string[]} {
    if (months.length === 0) return {length: 0, months: []};
    const sorted = [...months].sort();
    let bestLen = 1;
    let bestStart = 0;
    let runLen = 1;
    let runStart = 0;
    for (let i = 1; i < sorted.length; i++) {
        if (monthsApart(sorted[i - 1], sorted[i]) === 1) {
            runLen++;
        } else {
            runLen = 1;
            runStart = i;
        }
        if (runLen > bestLen) {
            bestLen = runLen;
            bestStart = runStart;
        }
    }
    return {length: bestLen, months: sorted.slice(bestStart, bestStart + bestLen)};
}

function monthsApart(a: string, b: string): number {
    const [ya, ma] = a.split('-').map(Number);
    const [yb, mb] = b.split('-').map(Number);
    return (yb - ya) * 12 + (mb - ma);
}

// Longest run of consecutive monthly nominations and wins across all games.
// Ties are broken by game name (alphabetical) for deterministic output.
export function computeStreaks(months: M12GMonthWithWinner[]): StreaksResult {
    const chronological = [...months].sort((a, b) => a.month.localeCompare(b.month));
    const nominations = new Map<string, string[]>();
    const wins = new Map<string, string[]>();

    for (const month of chronological) {
        for (const game of month.games) {
            const list = nominations.get(game.name) ?? [];
            list.push(month.month);
            nominations.set(game.name, list);
        }
        for (const winner of month.winners) {
            const list = wins.get(winner.name) ?? [];
            list.push(month.month);
            wins.set(winner.name, list);
        }
    }

    return {
        nomination: pickBestStreak(nominations),
        win: pickBestStreak(wins),
    };
}

function pickBestStreak(byGame: Map<string, string[]>): Streak | null {
    let best: Streak | null = null;
    const names = [...byGame.keys()].sort((a, b) => a.localeCompare(b, 'de-DE'));
    for (const name of names) {
        const run = findLongestRun(byGame.get(name)!);
        if (run.length < 2) continue;
        if (!best || run.length > best.length) {
            best = {name, slug: gameSlug(name), length: run.length, months: run.months};
        }
    }
    return best;
}
