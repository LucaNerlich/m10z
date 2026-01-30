export type HeadlineLevel = 2 | 3 | 4;

export type Headline = {
    level: HeadlineLevel;
    text: string;
    slug: string;
};

const HEADING_REGEX = /^\s{0,3}(#{2,4})\s+(.+?)\s*$/;
const FENCE_REGEX = /^\s*(```|~~~)/;
const TRAILING_HASHES_REGEX = /\s+#+\s*$/;

function stripInlineMarkdown(raw: string): string {
    return raw
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/<\/?[^>]+>/g, '')
        .replace(/[*_~]+/g, '')
        .trim();
}

function slugifyHeading(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function extractHeadlines(markdown: string): Headline[] {
    if (!markdown?.trim()) {
        return [];
    }

    const headlines: Headline[] = [];
    const slugCounts = new Map<string, number>();
    let inFence = false;

    for (const line of markdown.split('\n')) {
        if (FENCE_REGEX.test(line)) {
            inFence = !inFence;
            continue;
        }

        if (inFence) continue;

        const match = HEADING_REGEX.exec(line);
        if (!match) continue;

        const level = match[1].length as HeadlineLevel;
        const rawText = match[2].replace(TRAILING_HASHES_REGEX, '').trim();
        if (!rawText) continue;

        const text = stripInlineMarkdown(rawText);
        if (!text) continue;

        const baseSlug = slugifyHeading(text);
        if (!baseSlug) continue;

        const count = slugCounts.get(baseSlug) ?? 0;
        slugCounts.set(baseSlug, count + 1);
        const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

        headlines.push({level, text, slug});
    }

    return headlines;
}
