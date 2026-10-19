import crypto from 'node:crypto';

export function formatRssDate(date: Date): string {
    // RSS expects RFC 2822 / UTC string. A NaN date would serialize as the
    // literal "Invalid Date"; fall back to the epoch instead.
    return Number.isNaN(date.getTime()) ? new Date(0).toUTCString() : date.toUTCString();
}

/**
 * Parse a feed item date, falling back to the document's `publishedAt` and then
 * to the epoch. `new Date('garbage').toUTCString()` yields `Invalid Date`, which
 * silently breaks readers.
 */
export function parseFeedDate(
    value: string | null | undefined,
    fallback?: string | null,
): Date {
    for (const candidate of [value, fallback]) {
        if (!candidate) continue;
        const parsed = new Date(candidate);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date(0);
}

export function sha256Hex(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
}

// Characters that are illegal in XML 1.0 documents regardless of escaping.
// Pasting text from Word/PDF into Strapi commonly introduces these; emitting
// them verbatim makes the whole feed unparseable for every subscriber.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

function stripInvalidXmlChars(text: string): string {
    return text.replace(INVALID_XML_CHARS, '');
}

export function escapeXml(text: string): string {
    return stripInvalidXmlChars(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Make content safe for inclusion inside <![CDATA[ ... ]]> blocks.
 * The sequence ']]>' terminates CDATA; split it safely.
 */
export function escapeCdata(text: string): string {
    return stripInvalidXmlChars(text).replace(/]]>/g, ']]]]><![CDATA[>');
}


