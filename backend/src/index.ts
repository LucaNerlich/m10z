// import type { Core } from '@strapi/strapi';

import { invalidateNext } from './utils/invalidateNextCache';

export default {
    /**
     * Register middleware on the Document Service to invalidate
     * the Next.js frontend after successful mutations.
     */
    register({ strapi }: { strapi: { documents: { use: Function } } }) {
        const publishTargets = new Map<string, 'articlefeed' | 'audiofeed'>([
            ['api::article.article', 'articlefeed'],
            ['api::podcast.podcast', 'audiofeed'],
        ]);

        const updateTargets = new Map<string, 'articlefeed' | 'audiofeed'>([
            ['api::article-feed.article-feed', 'articlefeed'],
            ['api::audio-feed.audio-feed', 'audiofeed'],
        ]);

        strapi.documents.use(async (context: { uid: string; action: string }, next: () => Promise<unknown>) => {
            // Run the core operation first; only invalidate on success.
            const result = await next();

            if (context.action === 'publish' && publishTargets.has(context.uid)) {
                await invalidateNext(publishTargets.get(context.uid)!);
            } else if (context.action === 'update' && updateTargets.has(context.uid)) {
                await invalidateNext(updateTargets.get(context.uid)!);
            }

            return result;
        });
    },

    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {
    },
};
