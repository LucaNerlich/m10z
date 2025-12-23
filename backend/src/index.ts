import {invalidateNext} from './utils/invalidateNextCache';
import {buildAndPersistSearchIndex} from './services/searchIndexBuilder';

export default {
    /**
     * Register middleware on the Document Service to invalidate
     * the Next.js frontend after successful mutations.
     */
    register({strapi}: {strapi: any}) {
        const publishTargets = new Map<string, 'articlefeed' | 'audiofeed'>([
            ['api::article.article', 'articlefeed'],
            ['api::podcast.podcast', 'audiofeed'],
        ]);

        const updateTargets = new Map<string, 'articlefeed' | 'audiofeed'>([
            ['api::article-feed.article-feed', 'articlefeed'],
            ['api::audio-feed.audio-feed', 'audiofeed'],
        ]);

        const searchTargets = new Set<string>([
            'api::article.article',
            'api::podcast.podcast',
            'api::author.author',
            'api::category.category',
        ]);

        const rebuildActions = new Set<string>(['publish', 'update', 'delete', 'unpublish']);

        strapi.documents.use(async (context: {uid: string; action: string}, next: () => Promise<unknown>) => {
            // Run the core operation first; only invalidate on success.
            const result = await next();

            //Invalidate Content
            if (context.action === 'publish' && publishTargets.has(context.uid)) {
                await invalidateNext(publishTargets.get(context.uid)!);
            } else if (context.action === 'update' && updateTargets.has(context.uid)) {
                await invalidateNext(updateTargets.get(context.uid)!);
            }

            // Rebuild search index
            if (rebuildActions.has(context.action) && searchTargets.has(context.uid)) {
                try {
                    await buildAndPersistSearchIndex(strapi);
                    await invalidateNext('search-index');

                    // Invalidate Sitemap
                    await invalidateNext('sitemap');
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to rebuild search index', err);
                }
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
    async bootstrap({strapi}: {strapi: any}) {
        try {
            await buildAndPersistSearchIndex(strapi);
            // eslint-disable-next-line no-console
            console.log('Search index bootstrap completed');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Search index bootstrap failed (will rebuild on next publish)', err);
        }
    },
};
