import {mergeConfig, type UserConfig} from 'vite';

export default (config: UserConfig) => {
    // Important: always return the modified config
    return mergeConfig(config, {
        resolve: {
            alias: {
                '@': '/src',
            },
        },
        optimizeDeps: {
            // The dev dependency scanner crawls `**/*.html` under the backend
            // root, which includes HTML files uploaded to the media library
            // (e.g. an Auphonic export); their inline scripts fail the esbuild
            // parse and every `strapi develop` logs a failed scan. Nothing in
            // `public/` is admin app code.
            entries: ['**/*.html', '!public/**'],
        },
    });
};
