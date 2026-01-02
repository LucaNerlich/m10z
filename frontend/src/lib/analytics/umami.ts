/**
 * Removes diacritic marks from the given string, returning a version
 * of the string that consists only of base characters.
 *
 * @param {string} input - The string from which diacritics are to be removed.
 * @return {string} A new string with diacritic marks removed.
 */

function stripDiacritics(input: string): string {
    // NFKD splits characters like "ä" into "a" + diacritic mark.
    // Then we remove the diacritic marks.
    return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converts a given string into a URL-friendly "slug" by normalizing the text, removing diacritics,
 * converting to lowercase, replacing non-alphanumeric characters with dashes, and trimming excess dashes.
 *
 * @param {string} input - The string to be converted into a slug.
 * @return {string} The slugified version of the input string.
 */
export function slugifyUmami(input: string): string {
    return stripDiacritics(input)
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-') // spaces + punctuation -> dash
        .replace(/-+/g, '-') // collapse
        .replace(/^-+|-+$/g, ''); // trim
}

/**
 * Generates a unique event identifier by processing and concatenating the provided parts.
 *
 * @param {Array<string | number | null | undefined>} parts - An array of parts that will be joined to form the event ID. Each part can be a string, number, null, or undefined.
 * @return {string} - A slugified string formed by concatenating non-empty, trimmed parts. Defaults to 'click' if no valid parts are provided.
 */
export function umamiEventId(parts: Array<string | number | null | undefined>): string {
    const raw = parts
        .map((p) => (p == null ? '' : String(p)))
        .map((p) => p.trim())
        .filter(Boolean)
        .join('-');

    const slug = slugifyUmami(raw);
    return slug || 'click';
}

/**
 * Create an event id for non-page links (external, mailto, tel, etc.).
 *
 * Examples:
 * - outbound-forum-m10z-de
 * - outbound-discord-gg
 * - outbound-mailto
 */
export function umamiExternalLinkEvent(href: string, prefix = 'outbound'): string {
    const trimmed = (href ?? '').trim();
    if (!trimmed) return umamiEventId([prefix, 'link']);

    if (/^mailto:/i.test(trimmed)) return umamiEventId([prefix, 'mailto']);
    if (/^tel:/i.test(trimmed)) return umamiEventId([prefix, 'tel']);

    try {
        const base = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
        const url = new URL(base);

        // Keep it intentionally coarse so it stays readable (host + first path segment).
        const segments = url.pathname
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 2);

        const id = umamiEventId([prefix, url.hostname, ...segments]);
        return id.length > 90 ? id.slice(0, 90) : id;
    } catch {
        // Unknown/relative scheme. Still generate something stable-ish.
        const short = trimmed.length > 50 ? trimmed.slice(0, 50) : trimmed;
        return umamiEventId([prefix, short]);
    }
}


