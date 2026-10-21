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
    // The consumer concatenates the raw value, so stray whitespace would survive
    // into the built URL even though `new URL` trims it.
    if (typeof value !== 'string' || value !== value.trim()) {
        return false;
    }

    try {
        const url = new URL(value);
        // Compare parts, not the raw string: `URL.origin` lowercases the scheme and
        // host and drops a default port, so string equality rejected valid inputs
        // like `https://cms.m10z.de:443` that this function's own error message
        // promises are acceptable.
        return (
            (url.protocol === 'https:' || url.protocol === 'http:') &&
            url.username === '' &&
            url.password === '' &&
            url.search === '' &&
            url.hash === '' &&
            (url.pathname === '' || url.pathname === '/')
        );
    } catch {
        return false;
    }
}
