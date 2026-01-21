/**
 * Notify Next.js to invalidate cached content (feeds, legal pages).
 *
 * Security:
 * - Uses a shared secret header (do not log it).
 * - Uses HTTPS URL from env (or local dev).
 * - Fails open: never blocks Strapi write path if Next is unreachable.
 */

export type InvalidateTarget =
    'audiofeed'
    | 'articlefeed'
    | 'legal'
    | 'about'
    | 'search-index'
    | 'sitemap'
    | 'category'
    | 'author'
    | 'article'
    | 'podcast';

/**
 * Read an environment variable and return its value if it is set and non-empty.
 *
 * @param name - Name of the environment variable to read
 * @returns The environment variable's value, or `undefined` if it is not set or is an empty string
 */
function getEnv(name: string): string | undefined {
    const v = process.env[name];
    return v && v.length > 0 ? v : undefined;
}

function getNextBaseUrl(): string {
    // Prefer explicit URL, fall back for local dev.
    return (getEnv('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
}

function getSecret(): string | undefined {
    return getEnv('LEGAL_INVALIDATION_TOKEN') ?? getEnv('FEED_INVALIDATION_TOKEN');
}

export async function invalidateNext(target: InvalidateTarget): Promise<void> {
    const base = getNextBaseUrl();
    const secret = getSecret();
    if (!secret) {
        // Misconfiguration should be visible in logs, but don't throw.
        // eslint-disable-next-line no-console
        console.warn('Missing FEED_INVALIDATION_TOKEN; skipping Next invalidation');
        return;
    }

    const url = `${base}/api/${target}/invalidate`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'x-m10z-invalidation-secret': secret,
            },
        });

        if (!res.ok) {
            // eslint-disable-next-line no-console
            console.warn(`Next invalidation failed (${target}): ${res.status} ${res.statusText}`);
        }

        console.log(`Next invalidation successful (${target})`);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`Next invalidation request error (${target})`, err);
    }
}

