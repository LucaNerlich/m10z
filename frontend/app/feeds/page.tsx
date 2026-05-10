import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {getFeedsInfo} from '@/src/lib/strapi';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'RSS-Feeds',
    description:
        'RSS-Feeds von Mindestens 10 Zeichen. Abonnieren Sie unsere Artikel und Podcasts über RSS-Feeds.',
    path: '/feeds',
    ogImageAlt: 'RSS-Feeds von Mindestens 10 Zeichen',
});

export default async function FeedsPage() {
    const feeds = await getFeedsInfo({
        tags: ['feeds', 'strapi:feeds'],
    });


    return (
        <div data-list-page>
            <h1>{feeds.title}</h1>
            <Markdown markdown={feeds.content} />
        </div>
    );
}
