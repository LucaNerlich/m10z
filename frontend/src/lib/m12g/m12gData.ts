import {promises as fs} from 'node:fs';
import path from 'node:path';

import {type M12GGame, type M12GMonth, type M12GMonthWithWinner, type M12GOverview} from './types';

type Frontmatter = {
    forum?: string;
};

const MONTH_FILE_REGEX = /^\d{4}-\d{2}\.md$/;
const LIST_ITEM_REGEX = /^\s*[*-]\s+\[([^\]]+)\]\(([^)]+)\)(?:\s+(\d+))?\s*$/;

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
        games.push({name: name.trim(), link: link.trim(), votes: Number.isNaN(votes) ? 0 : votes});
    }

    return games;
}

function computeWinner(games: M12GGame[]): M12GGame | null {
    if (games.length === 0) return null;
    return games.reduce((currentWinner, candidate) => {
        if (!currentWinner) return candidate;
        if (candidate.votes > currentWinner.votes) return candidate;
        return currentWinner;
    }, games[0] ?? null);
}

function isPastMonth(monthId: string): boolean {
    const now = new Date();
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const cutoffMonth = cutoff.toISOString().slice(0, 7);
    return monthId < cutoffMonth;
}

async function loadMonthFromFile(filePath: string, monthId: string): Promise<M12GMonthWithWinner | null> {
    try {
        const rawContent = await fs.readFile(filePath, 'utf8');
        const {frontmatter, body} = parseFrontmatter(rawContent);
        const games = parseGamesFromBody(body);
        const month: M12GMonth = {
            month: monthId,
            forumThreadUrl: frontmatter.forum,
            games,
        };
        return {
            ...month,
            winner: computeWinner(games),
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
                if (!isPastMonth(monthId)) return null;
                const filePath = path.join(dataDir, fileName);
                return loadMonthFromFile(filePath, monthId);
            }),
        );

        return months.filter((month): month is M12GMonthWithWinner => Boolean(month));
    } catch {
        return [];
    }
}

export async function fetchM12GOverview(): Promise<M12GOverview> {
    const months = await loadM12GMonths();
    months.sort((a, b) => b.month.localeCompare(a.month));
    return {months};
}
