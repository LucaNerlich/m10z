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
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::query',
    {
        name: 'strapi::body',
        config: {
            // Applies to urlencoded bodies only. This middleware runs before
            // routing and auth, so a multi-gigabyte limit here is remotely
            // reachable without credentials.
            formLimit: '1mb',
            jsonLimit: '10mb',  // 10MB for JSON data
            textLimit: '10mb',  // 10MB for text content
            formidable: {
                maxFileSize: 500 * 1024 * 1024, // 500MB cap for audio/media uploads
            },
        },
    },
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
];
