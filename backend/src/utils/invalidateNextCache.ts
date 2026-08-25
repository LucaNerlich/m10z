/**
 * Notify Next.js to invalidate cached content for a specific entity mutation.
 *
 * Security:
 * - Uses a shared secret header (do not log it).
 * - Uses HTTPS URL from env (or local dev).
 * - Fails open: never blocks Strapi's write path if Next is unreachable.
 *
 * Payload shape is defined in `shared/strapi-contract/invalidationEvent.ts`.
 */

import type {InvalidationEvent} from '../shared/contracts/strapi-contract/invalidationEvent';

type Logger = {
    info?: (message: string) => void;
    warn?: (message: string, error?: unknown) => void;
};

function getEnv(name: string): string | undefined {
    const v = process.env[name];
    return v && v.length > 0 ? v : undefined;
}

function getNextBaseUrl(): string {
    return (getEnv('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
}

function getSecret(): string | undefined {
    return getEnv('STRAPI_INVALIDATION_SECRET');
}

function formatErrorForLog(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeEvent(event: InvalidationEvent): string {
    return `${event.type}:${event.action}${event.slug ? `:${event.slug}` : ''}`;
}

/**
 * POST an entity-level invalidation event to the frontend, with retry.
 *
 * @returns `true` if Next.js responded with 2xx; `false` on misconfiguration, HTTP error, or network failure after retries
 */
export async function postInvalidationEvent(
    event: InvalidationEvent,
    logger?: Logger,
    maxRetries: number = 3,
): Promise<boolean> {
    const log = {
        info: (msg: string) => (logger?.info ? logger.info(msg) : console.log(msg)),
        warn: (msg: string) => (logger?.warn ? logger.warn(msg) : console.warn(msg)),
    };

    const base = getNextBaseUrl();
    const secret = getSecret();
    if (!secret) {
        log.warn('Missing STRAPI_INVALIDATION_SECRET; skipping Next invalidation');
        return false;
    }

    const url = `${base}/api/invalidate`;
    const retryDelays = [1000, 2000, 4000];
    const delayFor = (attempt: number): number => retryDelays[attempt] ?? retryDelays[retryDelays.length - 1];
    const label = describeEvent(event);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-m10z-invalidation-secret': secret,
                },
                body: JSON.stringify(event),
                signal: AbortSignal.timeout(10000),
                // Never follow redirects: the secret header would be replayed to
                // whatever host responds (e.g. under a misconfigured http:// URL).
                redirect: 'error',
            });

            if (!res.ok) {
                if (res.status >= 500 && attempt < maxRetries - 1) {
                    log.warn(`Next invalidation failed (${label}): ${res.status} ${res.statusText}. Retrying in ${delayFor(attempt)}ms...`);
                    await delay(delayFor(attempt));
                    continue;
                }
                log.warn(`Next invalidation failed (${label}): ${res.status} ${res.statusText}`);
                return false;
            }

            log.info(`Next invalidation successful (${label})`);
            return true;
        } catch (err) {
            if (attempt < maxRetries - 1) {
                log.warn(
                    `Next invalidation request error (${label}), attempt ${attempt + 1}/${maxRetries}. Retrying in ${delayFor(attempt)}ms... Cause: ${formatErrorForLog(err)}`,
                );
                await delay(delayFor(attempt));
                continue;
            }
            log.warn(`Next invalidation request failed after ${maxRetries} attempts (${label}). Cause: ${formatErrorForLog(err)}`);
            return false;
        }
    }

    return false;
}
