import {absoluteRoute, routes} from '@/src/lib/routes';
import {fetchPublishedSlugs} from '@/src/lib/publishedSlugs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildLinkList(
    entries: {slug: string}[],
    buildPath: (slug: string) => string
): string {
    return entries
        .map(({slug}) => {
            const url = absoluteRoute(buildPath(slug));
            return `- [${slug}](${url})`;
        })
        .join('\n');
}

export async function GET() {
    const [articles, podcasts, categories, authors] = await Promise.all([
        fetchPublishedSlugs('articles', ['strapi:article']),
        fetchPublishedSlugs('podcasts', ['strapi:podcast']),
        fetchPublishedSlugs('categories', ['sitemap:categories']),
        fetchPublishedSlugs('authors', ['sitemap:authors']),
    ]);

    const lines = [
        '# M10Z – Mindestens 10 Zeichen',
        '',
        '> M10Z (Mindestens 10 Zeichen) is a German gaming and technology blog covering video games, podcasts, and tech culture.',
        '',
        'The site publishes articles and podcasts in German. Content covers game reviews, industry news, opinion pieces, and technology topics. The editorial team produces regular podcast episodes alongside written content.',
        '',
        '## Hauptseiten',
        '',
        `- [Startseite](${absoluteRoute(routes.home)}): Homepage with latest content`,
        `- [Artikel](${absoluteRoute(routes.articles)}): All articles`,
        `- [Podcasts](${absoluteRoute(routes.podcasts)}): All podcast episodes`,
        `- [Kategorien](${absoluteRoute(routes.categories)}): Content categories`,
        `- [Team](${absoluteRoute(routes.authors)}): Editorial team members`,
        `- [Über uns](${absoluteRoute(routes.about)}): About the site`,
        '',
        '## Feeds',
        '',
        `- [RSS Feed](${absoluteRoute(routes.articleFeed)}): Article RSS feed`,
        `- [Podcast Feed](${absoluteRoute(routes.audioFeed)}): Podcast audio feed`,
        '',
        '## Artikel',
        '',
        buildLinkList(articles, routes.article),
        '',
        '## Podcasts',
        '',
        buildLinkList(podcasts, routes.podcast),
        '',
        '## Kategorien',
        '',
        buildLinkList(categories, routes.category),
        '',
        '## Team',
        '',
        buildLinkList(authors, routes.author),
        '',
        '## Optional',
        '',
        `- [Impressum](${absoluteRoute(routes.imprint)}): Legal notice`,
        `- [Datenschutz](${absoluteRoute(routes.privacy)}): Privacy policy`,
    ];

    const body = lines.join('\n') + '\n';

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
    });
}
