/**
 * Admin routes of the umami-stats plugin.
 *
 * Mounted by Strapi at `/umami-stats/*` (admin-router scope, authenticated
 * admin users only). The widget calls `GET /umami-stats/stats` through the
 * admin fetch client, which targets the Strapi server origin.
 * Non-super-admin roles additionally need the generated
 * `plugin::umami-stats.stats.getStats` permission, otherwise they receive
 * 403 and the widget renders its NoPermissions state.
 */
'use strict';

module.exports = {
    type: 'admin',
    routes: [
        {
            method: 'GET',
            path: '/stats',
            handler: 'stats.getStats',
            config: {
                policies: ['admin::isAuthenticatedAdmin'],
            },
        },
    ],
};
