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
    // into the built URL even though `new URL` trims it. A lone `?` or `#` parses
    // to an empty search/hash, so it has to be rejected on the raw string: it
    // would turn `${BASE_DOMAIN}/uploads/...` into a query or a fragment.
    if (typeof value !== 'string' || value !== value.trim() || /[?#]/.test(value)) {
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
            // Any run of slashes: the consumer strips them all.
            /^\/+$/.test(url.pathname)
        );
    } catch {
        return false;
    }
}
