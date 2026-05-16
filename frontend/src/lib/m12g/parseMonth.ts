import {type M12GGame, type M12GMonthWithWinner} from './types';

const MONTH_ID_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const LIST_ITEM_REGEX = /^\s*[*-]\s+\[([^\]]+)\]\(([^)]+)\)(?:\s+(\d+))?\s*$/;
const EARLY_ACCESS_REGEX = /\s*\(Early Access\)\s*$/i;

type ParsedFrontmatter = {
    forum?: string;
    title?: string;
    finalized?: boolean;
};

export class M12GParseError extends Error {
    constructor(monthId: string, reason: string) {
        super(`M12G parse error in ${monthId}.md: ${reason}`);
        this.name = 'M12GParseError';
    }
}

function splitFrontmatter(raw: string, monthId: string): {frontmatter: ParsedFrontmatter; body: string} {
    if (!raw.startsWith('---')) {
        throw new M12GParseError(monthId, 'missing frontmatter delimiter (file must start with ---)');
    }
    const lines = raw.split('\n');
    const endIndex = lines.indexOf('---', 1);
    if (endIndex === -1) {
        throw new M12GParseError(monthId, 'unterminated frontmatter (no closing ---)');
    }

    const frontmatter: ParsedFrontmatter = {};
    for (const line of lines.slice(1, endIndex)) {
        if (line.trim() === '') continue;
        const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)\s*$/);
        if (!match) {
            throw new M12GParseError(monthId, `malformed frontmatter line: ${line}`);
        }
        const [, key, value] = match;
        const trimmed = value.trim();
        if (key === 'forum') {
            frontmatter.forum = trimmed;
        } else if (key === 'title') {
            frontmatter.title = trimmed;
        } else if (key === 'finalized') {
            const normalized = trimmed.toLowerCase();
            if (normalized !== 'true' && normalized !== 'false') {
                throw new M12GParseError(monthId, `finalized must be 'true' or 'false', got '${trimmed}'`);
            }
            frontmatter.finalized = normalized === 'true';
        }
    }

    return {frontmatter, body: lines.slice(endIndex + 1).join('\n')};
}

function parseGameLine(line: string, monthId: string): M12GGame {
    const match = line.match(LIST_ITEM_REGEX);
    if (!match) {
        throw new M12GParseError(monthId, `malformed list item: ${line}`);
    }
    const [, rawName, rawLink, voteValue] = match;
    const trimmedName = rawName.trim();
    const earlyAccess = EARLY_ACCESS_REGEX.test(trimmedName);
    const name = earlyAccess ? trimmedName.replace(EARLY_ACCESS_REGEX, '') : trimmedName;
    const votes = voteValue ? Number.parseInt(voteValue, 10) : 0;
    if (Number.isNaN(votes) || votes < 0) {
        throw new M12GParseError(monthId, `invalid vote count for '${name}': ${voteValue}`);
    }
    return {name, link: rawLink.trim(), votes, ...(earlyAccess && {earlyAccess})};
}

function parseGames(body: string, monthId: string): M12GGame[] {
    const games: M12GGame[] = [];
    for (const line of body.split('\n')) {
        if (line.trim() === '') continue;
        if (!/^\s*[*-]\s/.test(line)) continue;
        games.push(parseGameLine(line, monthId));
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

export function isMonthId(value: string): boolean {
    return MONTH_ID_REGEX.test(value);
}

// Returns null for draft months (finalized: false). Throws M12GParseError for any
// structural problem — missing required fields, malformed lines, invalid month-id —
// so format drift fails the render instead of silently dropping months.
export function parseMonth(raw: string, monthId: string): M12GMonthWithWinner | null {
    if (!isMonthId(monthId)) {
        throw new M12GParseError(monthId, `invalid month-id (expected YYYY-MM)`);
    }
    const {frontmatter, body} = splitFrontmatter(raw, monthId);
    if (frontmatter.finalized === undefined) {
        throw new M12GParseError(monthId, "missing required 'finalized' field");
    }
    if (!frontmatter.finalized) {
        return null;
    }
    if (!frontmatter.forum) {
        throw new M12GParseError(monthId, "missing required 'forum' field on finalized month");
    }
    if (!frontmatter.title) {
        throw new M12GParseError(monthId, "missing required 'title' field on finalized month");
    }

    const games = parseGames(body, monthId);
    return {
        month: monthId,
        title: frontmatter.title,
        forumThreadUrl: frontmatter.forum,
        games,
        winners: computeWinners(games),
        titleDefenders: [],
    };
}
