/**
 * Admin-only controller serving the aggregated Umami dashboard payload.
 *
 * Umami credentials never leave the server: the widget receives
 * pre-aggregated numbers only. Failures are mapped to HTTP statuses so the
 * widget can render dedicated states (unconfigured / forbidden / error)
 * instead of crashing the save flow — controllers here never throw.
 */
'use strict';

module.exports = ({strapi}) => ({
    async getStats(ctx) {
        try {
            const service = strapi.plugin('umami-stats').service('umami');
            ctx.body = await service.getDashboard();
        } catch (error) {
            const status = error && typeof error.status === 'number' ? error.status : 500;
            const code = error && typeof error.code === 'string' ? error.code : 'UMAMI_ERROR';
            strapi.log.error(`[umami-stats] Failed to load dashboard (code=${code}, status=${status}).`);
            ctx.status = status;
            ctx.body = {
                error: {
                    code,
                    message: 'Website statistics could not be loaded.',
                },
            };
        }
    },
});
