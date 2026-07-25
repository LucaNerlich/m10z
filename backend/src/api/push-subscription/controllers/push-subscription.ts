/**
 * push-subscription controller
 */

import {factories} from '@strapi/strapi';

const PUSH_SECRET_HEADER = 'x-m10z-push-secret';

function verifyPushSecret(request: any): boolean {
    const provided = request.request?.header?.(PUSH_SECRET_HEADER)
        ?? request.headers?.[PUSH_SECRET_HEADER]
        ?? null;
    const expected = process.env.PUSH_NOTIFICATION_SECRET ?? null;
    if (!provided || !expected) return false;
    try {
        const {timingSafeEqual} = require('crypto');
        const bufProvided = Buffer.from(provided);
        const bufExpected = Buffer.from(expected);
        if (bufProvided.length !== bufExpected.length) return false;
        return timingSafeEqual(bufProvided, bufExpected);
    } catch {
        return provided === expected;
    }
}

export default factories.createCoreController('api::push-subscription.push-subscription', () => ({
    async subscribe(ctx: any) {
        if (!verifyPushSecret(ctx)) {
            return ctx.unauthorized('Invalid push secret');
        }

        const {endpoint, keys} = ctx.request.body;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return ctx.badRequest('Invalid subscription object');
        }

        const existing = await strapi.db.query('api::push-subscription.push-subscription').findOne({
            where: {endpoint},
        });

        if (existing) {
            return ctx.send({status: 'exists'}, 200);
        }

        await strapi.db.query('api::push-subscription.push-subscription').create({
            data: {endpoint, keys},
        });

        return ctx.send({status: 'created'}, 201);
    },

    async unsubscribe(ctx: any) {
        if (!verifyPushSecret(ctx)) {
            return ctx.unauthorized('Invalid push secret');
        }

        const {endpoint} = ctx.request.body;
        if (!endpoint) {
            return ctx.badRequest('Missing endpoint');
        }

        const existing = await strapi.db.query('api::push-subscription.push-subscription').findOne({
            where: {endpoint},
        });

        if (existing) {
            await strapi.db.query('api::push-subscription.push-subscription').delete({
                where: {endpoint},
            });
        }

        return ctx.send({status: 'deleted'}, 204);
    },
}));
