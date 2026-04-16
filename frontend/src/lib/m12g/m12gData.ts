import {promises as fs} from 'node:fs';
import path from 'node:path';

import {type M12GGame, type M12GMonth, type M12GMonthWithWinner, type M12GOverview} from './types';

type Frontmatter = {
    forum?: string;
    title?: string;
    finalized?: boolean;
};

const MONTH_FILE_REGEX = /^\d{4}-\d{2}\.md$/;
const LIST_ITEM_REGEX = /^\s*[*-]\s+\[([^\]]+)\]\(([^)]+)\)(?:\s+(\d+))?\s*$/;
const TITLE_DEFENDER_NAME_SUFFIX = ' (Titelträger)';

/** Strips manual "(Titelträger)" hints from markdown link text so names match across months. */
function normalizeM12GGameName(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.endsWith(TITLE_DEFENDER_NAME_SUFFIX)) {
        return trimmed.slice(0, -TITLE_DEFENDER_NAME_SUFFIX.length).trim();
    }
    return trimmed;
}

function parseFrontmatter(rawContent: string): {frontmatter: Frontmatter; body: string} {
    if (!rawContent.startsWith('---')) {
        return {frontmatter: {}, body: rawContent};
    }

    const lines = rawContent.split('\n');
    const endIndex = lines.indexOf('---', 1);
    if (endIndex === -1) {
        return {frontmatter: {}, body: rawContent};
    }

    const frontmatterLines = lines.slice(1, endIndex);
    const body = lines.slice(endIndex + 1).join('\n');
    const frontmatter: Frontmatter = {};

    for (const line of frontmatterLines) {
        const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)\s*$/);
        if (!match) continue;
        const [, key, value] = match;
        if (key === 'forum') {
            frontmatter.forum = value.trim();
        }
        if (key === 'title') {
            frontmatter.title = value.trim();
        }
        if (key === 'finalized') {
            const normalizedValue = value.trim().toLowerCase();
            if (normalizedValue === 'true') {
                frontmatter.finalized = true;
            } else if (normalizedValue === 'false') {
                frontmatter.finalized = false;
            }
        }
    }

    return {frontmatter, body};
}

function parseGamesFromBody(body: string): M12GGame[] {
    const games: M12GGame[] = [];
    const lines = body.split('\n');

    for (const line of lines) {
        const match = line.match(LIST_ITEM_REGEX);
        if (!match) continue;
        const [, name, link, voteValue] = match;
        const votes = voteValue ? Number.parseInt(voteValue, 10) : 0;
        games.push({
            name: normalizeM12GGameName(name),
            link: link.trim(),
            votes: Number.isNaN(votes) ? 0 : votes,
        });
    }

    games.sort((a, b) => b.votes - a.votes);
    return games;
}

function computeWinners(games: M12GGame[]): M12GGame[] {
    if (games.length === 0) return [];
    const maxVotes = games[0].votes;
    if (maxVotes === 0) return [];
    return games.filter((game) => game.votes === maxVotes);
}

async function loadMonthFromFile(filePath: string, monthId: string): Promise<M12GMonthWithWinner | null> {
    try {
        const rawContent = await fs.readFile(filePath, 'utf8');
        const {frontmatter, body} = parseFrontmatter(rawContent);
        if (frontmatter.finalized !== true) {
            return null;
        }
        const games = parseGamesFromBody(body);
        const month: M12GMonth = {
            month: monthId,
            forumThreadUrl: frontmatter.forum,
            title: frontmatter.title,
            games,
        };
        return {
            ...month,
            winners: computeWinners(games),
            titleDefenders: [],
        };
    } catch {
        return null;
    }
}

async function loadM12GMonths(): Promise<M12GMonthWithWinner[]> {
    const dataDir = path.join(process.cwd(), 'public', 'm12g');
    try {
        const entries = await fs.readdir(dataDir);
        const monthFiles = entries.filter((entry) => MONTH_FILE_REGEX.test(entry));
        const months = await Promise.all(
            monthFiles.map(async (fileName) => {
                const monthId = fileName.replace(/\.md$/, '');
                const filePath = path.join(dataDir, fileName);
                return loadMonthFromFile(filePath, monthId);
            }),
        );

        return months.filter((month): month is M12GMonthWithWinner => Boolean(month));
    } catch {
        return [];
    }
}

// Marks games that won the previous month and were nominated again this month.
// A "title defender" is the returning champion — shown in the UI to highlight repeat contenders.
// After a tied month, every co-winner can be a defender in the next month.
function assignTitleDefenders(months: M12GMonthWithWinner[]): void {
    const chronological = [...months].sort((a, b) => a.month.localeCompare(b.month));
    for (let i = 1; i < chronological.length; i++) {
        const previousWinners = chronological[i - 1]?.winners ?? [];
        if (previousWinners.length === 0) continue;
        const previousWinnerNames = new Set(previousWinners.map((w) => w.name));
        const current = chronological[i];
        const defenders = current.games.filter((game) => previousWinnerNames.has(game.name));
        if (defenders.length > 0) {
            current.titleDefenders = defenders.map((game) => game.name);
        }
    }
}

export async function fetchM12GOverview(): Promise<M12GOverview> {
    const months = await loadM12GMonths();
    assignTitleDefenders(months);
    months.sort((a, b) => b.month.localeCompare(a.month));
    return {months};
}
