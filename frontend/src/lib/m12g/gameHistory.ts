import {
    type M12GGameIndexEntry,
    type M12GLeaderboardEntry,
    type M12GMonthWithWinner,
} from './types';

// One Month in which a Game was nominated, with that Month's outcome for the Game.
// Carries enough Month context (title, forum thread) to render a Game's timeline
// without re-reading the Months — see CONTEXT.md (Game history).
export type GameAppearance = {
    month: string;
    votes: number;
    isWinner: boolean;
    title?: string;
    forumThreadUrl?: string;
};

// Aggregated record of one Game across every Month it appeared in.
// Canonical name (post Early-Access strip) is the identity — see CONTEXT.md.
// `appearances` are chronological (oldest first).
export type GameHistory = {
    name: string;
    slug: string;
    link: string;
    totalVotes: number;
    monthsNominated: number;
    wins: number;
    appearances: GameAppearance[];
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

// Single walk over the Months → one GameHistory per canonical game name. Expects
// `chronological` sorted oldest-first (the Archive guarantees this), so the first link
// seen wins and appearances come out chronological without a second sort.
export function buildGameHistory(chronological: M12GMonthWithWinner[]): GameHistory[] {
    const byName = new Map<string, GameHistory>();

    for (const month of chronological) {
        const winnerNames = new Set(month.winners.map((w) => w.name));
        for (const game of month.games) {
            const isWinner = winnerNames.has(game.name);
            const appearance: GameAppearance = {
                month: month.month,
                votes: game.votes,
                isWinner,
                ...(month.title !== undefined && {title: month.title}),
                ...(month.forumThreadUrl !== undefined && {forumThreadUrl: month.forumThreadUrl}),
            };
            const existing = byName.get(game.name);
            if (existing) {
                existing.totalVotes += game.votes;
                existing.monthsNominated += 1;
                if (isWinner) existing.wins += 1;
                existing.appearances.push(appearance);
            } else {
                byName.set(game.name, {
                    name: game.name,
                    slug: gameSlug(game.name),
                    link: game.link,
                    totalVotes: game.votes,
                    monthsNominated: 1,
                    wins: isWinner ? 1 : 0,
                    appearances: [appearance],
                });
            }
        }
    }

    return [...byName.values()];
}

export function toLeaderboard(history: GameHistory[], limit: number): M12GLeaderboardEntry[] {
    return [...history]
        .sort((a, b) => b.totalVotes - a.totalVotes || b.monthsNominated - a.monthsNominated)
        .slice(0, limit)
        .map(({appearances: _appearances, ...entry}) => entry);
}

export function toGameIndex(history: GameHistory[]): M12GGameIndexEntry[] {
    return [...history]
        .sort((a, b) => a.name.localeCompare(b.name, 'de-DE'))
        .map(({appearances, ...entry}) => ({...entry, months: appearances.map((a) => a.month)}));
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
// Projection over the prebuilt Game histories — no second walk over the Months.
export function computeStreaks(history: GameHistory[]): StreaksResult {
    const nominations = new Map<string, string[]>();
    const wins = new Map<string, string[]>();

    for (const game of history) {
        nominations.set(
            game.name,
            game.appearances.map((a) => a.month),
        );
        const winMonths = game.appearances.filter((a) => a.isWinner).map((a) => a.month);
        if (winMonths.length > 0) wins.set(game.name, winMonths);
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
