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

type Logger = {
    info?: (message: string) => void;
    warn?: (message: string, error?: unknown) => void;
};

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
    return getEnv('FEED_INVALIDATION_TOKEN') ?? getEnv('LEGAL_INVALIDATION_TOKEN');
}

/**
 * Delay execution for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Invalidate Next.js cache with retry logic
 *
 * @param target - The cache target to invalidate
 * @param logger - Optional logger instance (defaults to console)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 */
export async function invalidateNext(
    target: InvalidateTarget,
    logger?: Logger,
    maxRetries: number = 3
): Promise<void> {
    const log = {
        info: logger?.info || ((msg: string) => console.log(msg)),
        warn: logger?.warn || ((msg: string, err?: unknown) => console.warn(msg, err))
    };

    const base = getNextBaseUrl();
    const secret = getSecret();
    if (!secret) {
        // Misconfiguration should be visible in logs, but don't throw.
        log.warn('Missing FEED_INVALIDATION_TOKEN; skipping Next invalidation');
        return;
    }

    const url = `${base}/api/${target}/invalidate`;
    const retryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'x-m10z-invalidation-secret': secret,
                },
                // Add timeout to prevent hanging requests
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            if (!res.ok) {
                // Non-2xx status code
                if (res.status >= 500 && attempt < maxRetries - 1) {
                    // Server error - retry
                    log.warn(`Next invalidation failed (${target}): ${res.status} ${res.statusText}. Retrying in ${retryDelays[attempt]}ms...`);
                    await delay(retryDelays[attempt]);
                    continue;
                }
                // Client error or final attempt - don't retry
                log.warn(`Next invalidation failed (${target}): ${res.status} ${res.statusText}`);
                return;
            }

            log.info(`Next invalidation successful (${target})`);
            return; // Success - exit
        } catch (err) {
            // Network error or timeout
            if (attempt < maxRetries - 1) {
                log.warn(`Next invalidation request error (${target}), attempt ${attempt + 1}/${maxRetries}. Retrying in ${retryDelays[attempt]}ms...`, err);
                await delay(retryDelays[attempt]);
                continue;
            }
            // Final attempt failed
            log.warn(`Next invalidation request failed after ${maxRetries} attempts (${target})`, err);
            return; // Fail open - don't throw
        }
    }
}

