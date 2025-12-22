const {env} = require('@strapi/utils')
export default () => ({
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
                defaultFrom: env('EMAIL_FROM', 'no-reply@pnn-it.de'),
                defaultReplyTo: env('EMAIL_REPLY_TO', 'no-reply@pnn-it.de'),
            },
        },
    },
});
