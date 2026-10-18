/**
 * Extract the client's IP address from standard proxy headers.
 *
 * Trusts the last entry of the `x-forwarded-for` header: proxies append the
 * connecting address to the right, so the right-most hop is the only one the
 * proxy set itself — every entry left of it is client-supplied and spoofable.
 * Falls back to `x-real-ip`, and returns `'unknown'` when no usable value is
 * present.
 *
 * Accepts either a `Request` or anything with a `get(name)` header lookup, so
 * server components can pass Next's `ReadonlyHeaders` (from `headers()`)
 * instead of re-implementing the parsing and trusting the wrong hop.
 */

// Loose IPv4/IPv6 shape check. Keeps rate-limit keys free of arbitrary garbage
// (spoofed header values become Map keys) while accepting common proxy formats
// such as "::ffff:192.0.2.1".
const IP_SHAPE = /^[0-9a-fA-F:.%]+$/;

function isPlausibleIp(value: string): boolean {
    return IP_SHAPE.test(value) && /[0-9]/.test(value);
}

/** Minimal header lookup contract — `Headers`, Next's `ReadonlyHeaders`, or similar. */
export type HeaderSource = {
    get(name: string): string | null;
};

function resolveHeaders(source: Request | HeaderSource): HeaderSource {
    // Prefer the object itself when it can look up headers; only `Request` keeps
    // them behind `.headers`. Do not probe `'headers' in source`: Next's
    // `ReadonlyHeaders` exposes the raw incoming bag under that exact name (no
    // `get` method), so the probe picks the wrong object and the next lookup
    // crashes (#991).
    if (typeof (source as {get?: unknown}).get === 'function') return source as HeaderSource;
    return (source as Request).headers;
}

export function getClientIp(source: Request | HeaderSource): string {
    const headers = resolveHeaders(source);
    const xff = headers.get('x-forwarded-for');
    if (xff) {
        const hops = xff.split(',');
        const last = hops[hops.length - 1]?.trim();
        if (last && isPlausibleIp(last)) return last;
    }
    const realIp = headers.get('x-real-ip')?.trim();
    if (realIp && isPlausibleIp(realIp)) return realIp;
    return 'unknown';
}
