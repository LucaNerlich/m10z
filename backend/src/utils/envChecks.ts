/** An absolute origin: scheme, host with optional port, no path or slash. */
const BASE_DOMAIN_PATTERN = /^https?:\/\/[^/]+$/;

/**
 * Validate the shape of `BASE_DOMAIN`.
 *
 * The value is concatenated with media paths to build absolute URLs for the
 * search index, so a bare host (`localhost:1337`) boots fine but silently
 * yields non-absolute cover URLs. Require the documented origin shape instead.
 *
 * @param value - Raw `BASE_DOMAIN` value.
 * @returns `true` when the value is an absolute http(s) origin.
 */
export function isValidBaseDomain(value: string | undefined): boolean {
    return typeof value === 'string' && BASE_DOMAIN_PATTERN.test(value);
}
