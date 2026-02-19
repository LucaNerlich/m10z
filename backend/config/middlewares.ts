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
            formLimit: '2gb',   // 2GB for larger audio/media file uploads
            jsonLimit: '10mb',  // 10MB for JSON data
            textLimit: '10mb',  // 10MB for text content
            formidable: {
                maxFileSize: 2147483648, // 2GB for larger audio files
            },
        },
    },
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
];
