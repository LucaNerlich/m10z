/**
 * Server entry point of the umami-stats local plugin.
 *
 * Loaded directly by Node.js (no transpilation step), therefore this file
 * and everything under `server/` is plain JavaScript with JSDoc types.
 */
'use strict';

const controllers = require('./server/controllers');
const services = require('./server/services');
const routes = require('./server/routes');

module.exports = () => {
    return {
        controllers,
        services,
        routes,
        async bootstrap({strapi}) {
            await strapi.admin.services.permission.actionProvider.registerMany([
                {
                    section: 'plugins',
                    displayName: 'Read dashboard statistics',
                    // Strapi's action uid must be lowercase letters/dots/hyphens only.
                    uid: 'stats.get-stats',
                    pluginName: 'umami-stats',
                },
            ]);
        },
    };
};
