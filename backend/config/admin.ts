export default ({env}) => ({
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
            domain: env('BASE_DOMAIN', 'cms.m10z.de'),
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
        allowedOrigins: ['https://m10z.de', 'http://localhost:3000'],
        async handler(uid, {documentId}) {
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
            return `${route}?secret=${encodeURIComponent(secret)}`;
        },
    },
});
