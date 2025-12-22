import type {StrapiApp} from '@strapi/strapi/admin';

export default {
    config: {
        locales: [
            'de',
            'en',
        ],
    },
    bootstrap(app: StrapiApp) {
        console.log(app);
    },
};
