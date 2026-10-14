const {env} = require('@strapi/utils')
export default () => ({
    'umami-stats': {
        enabled: true,
        resolve: './src/plugins/umami-stats',
    },
    email: {
        enabled: true,
        config: {
            provider: 'mailgun',
            providerOptions: {
                key: env('MAILGUN_API_KEY'),
                domain: env('MAILGUN_DOMAIN'),
                url: env('MAILGUN_HOST'),
            },
            settings: {
                // Fallback kept on the platform domain so auth mail is never sent
                // from a foreign address; the users-permissions templates carry the
                // same default (config/sync/core-store.plugin_users-permissions_email.json).
                defaultFrom: env('EMAIL_FROM', 'no-reply@m10z.de'),
                defaultReplyTo: env('EMAIL_REPLY_TO', 'no-reply@m10z.de'),
            },
        },
    },
});
