/**
 * Extract the client's IP address from standard proxy headers.
 *
 * Prefers the first entry of the `x-forwarded-for` header, falls back to `x-real-ip`,
 * and returns `'unknown'` when no usable value is present.
 */
export function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}


