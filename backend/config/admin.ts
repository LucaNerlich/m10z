import crypto from 'node:crypto';

/**
 * Resolve the admin session cookie's `Domain`.
 *
 * A `Set-Cookie` `Domain` must be a bare host and a suffix of the admin host;
 * a mismatched value is silently dropped by the browser. An empty value means
 * "omit Domain", i.e. a host-only cookie, which is what local admin logins on
 * `localhost:1337` need. Production sets `ADMIN_COOKIE_DOMAIN=cms.m10z.de`.
 */
export function resolveAuthCookieDomain(value: string | undefined): string | undefined {
    return value || undefined;
}

export default ({env}: any) => {
    const clientUrl = env('CLIENT_URL');

    return {
    auth: {
        secret: env('ADMIN_JWT_SECRET'),
        sessions: {
            accessTokenLifespan: 1800,
            maxRefreshTokenLifespan: 30 * 24 * 60 * 60,
            idleRefreshTokenLifespan: 7 * 24 * 60 * 60,
            maxSessionLifespan: 7 * 24 * 60 * 60,
            idleSessionLifespan: 3600,
        },
        cookie: {
            sameSite: 'lax',
            path: '/admin',
            // Bare cookie host (a Set-Cookie `Domain` must be a suffix of the
            // admin host). Empty means a host-only cookie, which keeps local
            // logins on localhost working. Kept separate from `BASE_DOMAIN`,
            // which is an absolute origin URL used to build media URLs.
            domain: resolveAuthCookieDomain(env('ADMIN_COOKIE_DOMAIN', '')),
        },
    },
    apiToken: {
        salt: env('API_TOKEN_SALT'),
    },
    transfer: {
        token: {
            salt: env('TRANSFER_TOKEN_SALT'),
        },
    },
    secrets: {
        encryptionKey: env('ENCRYPTION_KEY'),
    },
    flags: {
        nps: env.bool('FLAG_NPS', false),
        promoteEE: env.bool('FLAG_PROMOTE_EE', false),
    },
    watchIgnoreFiles: [
        '**/config/sync/**',
    ],
        preview: {
            enabled: true,
            config: {
                allowedOrigins: [clientUrl, 'https://m10z.de', 'http://localhost:3000'].filter(Boolean),
                // Maps Strapi content UIDs to frontend preview routes.
                // Only articles and podcasts support preview; other types return null (no preview link).
                async handler(uid: any, {documentId, locale, status}: any) {
                    if (!clientUrl) return null;
                    if (!documentId) return null;

                    const document = await strapi.documents(uid).findOne({documentId});
                    const slug = document?.slug;
                    if (!slug) return null;

                    let route: string | null = null;
                    if (uid === 'api::article.article') {
                        route = `/preview/artikel/${slug}`;
                    }
                    if (uid === 'api::podcast.podcast') {
                        route = `/preview/podcasts/${slug}`;
                    }
                    if (!route) return null;

                    const secret = env('STRAPI_PREVIEW_SECRET');
                    if (!secret) return null;

                    // Bind the token to this document (uid+slug) so a leaked link cannot be
                    // reused to unlock any other draft article/podcast.
                    const token = crypto.createHmac('sha256', secret).update(`${uid}:${slug}`).digest('hex');

                    // Normalize Strapi's status values to the two states the frontend understands.
                    const previewStatus = status === 'published' ? 'published' : 'draft';
                    const query = new URLSearchParams({
                        token,
                        status: previewStatus,
                    });
                    return `${clientUrl}${route}?${query.toString()}`;
                },
            },
        },
    };
};
