/**
 * Extract the client's IP address from standard proxy headers.
 *
 * Trusts the last entry of the `x-forwarded-for` header: proxies append the
 * connecting address to the right, so the right-most hop is the only one the
 * proxy set itself — every entry left of it is client-supplied and spoofable.
 * Falls back to `x-real-ip`, and returns `'unknown'` when no usable value is
 * present.
 */

// Loose IPv4/IPv6 shape check. Keeps rate-limit keys free of arbitrary garbage
// (spoofed header values become Map keys) while accepting common proxy formats
// such as "::ffff:192.0.2.1".
const IP_SHAPE = /^[0-9a-fA-F:.%]+$/;

function isPlausibleIp(value: string): boolean {
    return IP_SHAPE.test(value) && /[0-9]/.test(value);
}

export function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) {
        const hops = xff.split(',');
        const last = hops[hops.length - 1]?.trim();
        if (last && isPlausibleIp(last)) return last;
    }
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp && isPlausibleIp(realIp)) return realIp;
    return 'unknown';
}
