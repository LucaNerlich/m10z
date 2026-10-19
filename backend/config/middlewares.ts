/**
 * Origins allowed to call the content API from a browser.
 *
 * `strapi::cors` defaults to `origin: '*'` with `credentials: true`, which
 * reflects any request's `Origin` back and hands every third-party page a
 * credentialed CORS answer. Pin it to the frontend origins instead.
 */
const CORS_ORIGINS = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    'https://m10z.de',
    'https://umami.m10z.de',
    'http://localhost:3000',
].filter((origin): origin is string => Boolean(origin));

export default [
    'strapi::logger',
    'strapi::errors',
    {
        name: 'strapi::security',
        config: {
            contentSecurityPolicy: {
                directives: {
                    'script-src': ['\'self\'', '\'unsafe-inline\''],
                    'img-src': [
                        'blob:',
                        '\'self\'',
                        'data:',
                        'market-assets.strapi.io',
                        'strapi.io',
                        'dl.airtable.com',
                    ],
                    'media-src': [
                        'blob:',
                        '\'self\'',
                        'data:',
                        'market-assets.strapi.io',
                        'strapi.io',
                        'dl.airtable.com',
                    ],
                },
            },
        },
    },
    {
        name: 'strapi::cors',
        config: {
            origin: CORS_ORIGINS,
        },
    },
    'strapi::poweredBy',
    'strapi::query',
    // Runs before the body parser: multipart is the only body type allowed to
    // carry a multi-gigabyte payload, and that allowance must not be reachable
    // on public routes. The guard rejects non-upload multipart before buffering.
    'global::multipartGuard',
    {
        name: 'strapi::body',
        config: {
            // Only urlencoded bodies. This middleware parses before routing and
            // auth, so this one stays small: a multi-gigabyte allowance here
            // would be remotely reachable without credentials. Multipart uploads
            // (audio/media) are governed by `formidable.maxFileSize` below.
            formLimit: '1mb',
            jsonLimit: '10mb',  // 10MB for JSON data
            textLimit: '10mb',  // 10MB for text content
            formidable: {
                maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB for audio/media uploads
            },
        },
    },
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
];
