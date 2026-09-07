/**
 * Strapi service wiring the Umami client into the plugin.
 *
 * Credentials are read from the environment on every call so secret
 * rotations take effect without a restart. Missing configuration yields a
 * 503-style error (rendered by the widget as a setup hint) and never
 * crashes Strapi at boot time.
 */
'use strict';

const {createConfigError, readUmamiConfig} = require('../utils/umami');
const {createUmamiClient} = require('../utils/umamiClient');

module.exports = ({strapi}) => {
    const client = createUmamiClient({log: strapi.log});

    return {
        /**
         * Load the aggregated dashboard payload (server-side cached).
         *
         * @returns {Promise<object>} ranges, topSlugs, cachedAt, cacheTtlSeconds, cacheHit
         */
        async getDashboard() {
            const config = readUmamiConfig(process.env);
            if (!config.ok) {
                strapi.log.warn(`[umami-stats] Missing environment variables: ${config.missing.join(', ')}`);
                throw createConfigError(config.missing);
            }
            return client.getDashboard(config.value);
        },
    };
};
