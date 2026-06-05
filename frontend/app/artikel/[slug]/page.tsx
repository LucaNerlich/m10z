import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {fetchArticleBySlug, fetchRelatedArticles, fetchRelatedPodcasts} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {buildContentSlugMetadata} from '@/src/lib/metadata/contentSlugMetadata';
import {deriveExcerpt} from '@/src/lib/metadata/excerpt';
import {formatIso8601Date} from '@/src/lib/jsonld/helpers';
import {ArticleDetail} from '@/src/components/ArticleDetail';
import {RelatedContent} from '@/src/components/RelatedContent';
import {getErrorMessage, isTimeoutOrSocketError} from '@/src/lib/errors';
import {fetchPublishedSlugs} from '@/src/lib/publishedSlugs';
import {contentTag} from '@/src/lib/strapi/cacheTags';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Pre-generate static params for all published articles at build time.
 * Returns an empty array if the CMS is unreachable, allowing ISR at runtime.
 */
export async function generateStaticParams() {
    try {
        const entries = await fetchPublishedSlugs('articles', [contentTag('article')]);
        return entries.map(({slug}) => ({slug}));
    } catch {
        return [];
    }
}

/**
 * Build OpenGraph, Twitter, author, and alternate metadata for an article identified by slug.
 *
 * @param params - Page route params containing a `slug` that identifies the article
 * @returns A Metadata object with `title`, `description`, `alternates` (canonical URL), `openGraph` (type 'article', `locale`, `siteName`, `url`, `title`, `description`, `images`, `publishedTime`, `modifiedTime`, `authors`), `twitter` (card, `title`, `description`, `images`), and `authors`; or an empty object if the slug is invalid or the article cannot be found.
 */
export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    return buildContentSlugMetadata({
        params,
        canonicalPath: (slug) => `/artikel/${slug}`,
        contentLabel: 'article',
        fetchBySlug: fetchArticleBySlug,
        getTitle: (article) => article.title,
        getDescription: (article) => article.description?.trim() || deriveExcerpt(article.content),
        ogType: 'article',
        getMediaSource: (article) => article,
        getAuthors: (article) => article.authors?.map((a) => a.title).filter(Boolean) as string[] | undefined,
        getOpenGraphExtras: (article) => ({
            publishedTime: formatIso8601Date(getEffectiveDate(article)),
            modifiedTime: formatIso8601Date(article.publishedAt),
            authors: article.authors?.map((a) => a.title).filter(Boolean) as string[] | undefined,
        }),
    });
}

/**
 * Render the article detail page for the given slug.
 *
 * Fetches the article server-side and returns the ArticleDetail client component. If the slug is invalid, the article does not exist, or a fetch error/404 occurs, this will trigger a 404 response via `notFound()`.
 *
 * @returns The React element that renders the article detail view, or triggers a 404 response.
 */
export default async function ArticleDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) notFound();

    const article = await fetchArticleBySlug(slug).catch((error: unknown) => {
        const errorMessage = getErrorMessage(error);
        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching article for slug "${slug}":`, errorMessage);
        } else if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
            console.error(`Error fetching article for slug "${slug}":`, errorMessage);
        }
        return null;
    });

    if (!article) notFound();

    const categorySlugs = article.categories?.map((c) => c.slug).filter(Boolean) as string[] ?? [];
    const [relatedArticles, relatedPodcasts] = await Promise.all([
        fetchRelatedArticles(categorySlugs, slug).catch(() => []),
        fetchRelatedPodcasts(categorySlugs, slug).catch(() => []),
    ]);

    return (
        <>
            <ArticleDetail slug={slug} article={article} />
            <RelatedContent articles={relatedArticles} podcasts={relatedPodcasts} />
        </>
    );
}