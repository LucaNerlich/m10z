/**
 * Validate the shape of `BASE_DOMAIN`.
 *
 * The value is concatenated with media paths to build absolute URLs for the
 * search index, so a bare host (`localhost:1337`) boots fine but silently
 * yields non-absolute cover URLs. Require the documented origin shape instead.
 * A trailing slash is accepted because the consumer strips trailing slashes.
 *
 * @param value - Raw `BASE_DOMAIN` value.
 * @returns `true` when the value is an absolute http(s) origin.
 */
export function isValidBaseDomain(value: string | undefined): boolean {
    if (typeof value !== 'string') {
        return false;
    }

    try {
        const url = new URL(value);
        return (
            (url.protocol === 'https:' || url.protocol === 'http:') &&
            url.origin === value.replace(/\/+$/, '')
        );
    } catch {
        return false;
    }
}
