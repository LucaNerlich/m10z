/**
 * Cache invalidation middleware for Strapi document operations.
 *
 * Invalidates Next.js caches after successful mutations using the shared
 * invalidation manifest (`shared/invalidation/manifest.ts`).
 */

import {DOCUMENT_INVALIDATION} from '../shared/contracts/invalidation/manifest';

import {queueCacheInvalidation} from '../services/asyncCacheInvalidationQueue';
import {sendPushNotifications} from '../services/pushNotificationService';

export async function cacheInvalidationMiddleware(
    context: {uid: string; action: string; params?: any},
    next: () => Promise<unknown>,
): Promise<unknown> {
    const result = await next();

    const entry = DOCUMENT_INVALIDATION[context.uid];
    if (!entry) return result;

    if (!entry.actions.includes(context.action as 'publish' | 'update')) return result;

    const strapiInstance = context.params?.strapi;
    if (!strapiInstance) {
        console.warn('[cacheInvalidation] Missing strapiInstance for cache invalidation', {
            action: context.action,
            uid: context.uid,
        });
        return result;
    }

    for (const target of entry.targets) {
        queueCacheInvalidation(target, strapiInstance);
    }

    // Fire push notifications for article/podcast publish actions
    if (context.action === 'publish') {
        const contentType = context.uid === 'api::article.article' ? 'article'
            : context.uid === 'api::podcast.podcast' ? 'podcast'
            : null;

        if (contentType) {
            const document = context.params?.data ?? context.params?.document ?? {};
            const articleTitle: string | undefined = document.title;
            const articleSlug: string | undefined = document.slug;

            if (articleTitle && articleSlug) {
                const url = contentType === 'article'
                    ? `https://m10z.de/artikel/${articleSlug}`
                    : `https://m10z.de/podcasts/${articleSlug}`;

                // Fire-and-forget: don't block the publish response
                sendPushNotifications(contentType, articleTitle, url, strapiInstance).catch(
                    (error) => strapiInstance.log.warn('[pushNotifications] Error sending push notification', error)
                );
            }
        }
    }

    return result;
}
