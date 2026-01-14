import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {getFeedsInfo} from '@/src/lib/strapi';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

export const metadata: Metadata = {
    title: 'RSS-Feeds',
    description: 'RSS-Feeds von Mindestens 10 Zeichen. Abonnieren Sie unsere Artikel und Podcasts über RSS-Feeds.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/feeds'),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                width: 1200,
                height: 630,
            },
        ],
    },
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: absoluteRoute('/feeds'),
    },
};

export default async function FeedsPage() {
    const feeds = await getFeedsInfo({
        tags: ['feeds', 'strapi:feeds'],
    });


    return (
        <main data-list-page>
            <h1>{feeds.title}</h1>
            <Markdown markdown={feeds.content} />
        </main>
    );
}
