import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {fetchArticleBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {getOptimalMediaFormat, pickBannerOrCoverMedia} from '@/src/lib/rss/media';
import {formatIso8601Date} from '@/src/lib/jsonld/helpers';
import {ArticleDetail} from '@/src/components/ArticleDetail';
import {getErrorMessage, isTimeoutOrSocketError} from '@/src/lib/errors';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Build OpenGraph, Twitter, author, and alternate metadata for an article identified by slug.
 *
 * @param params - Page route params containing a `slug` that identifies the article
 * @returns A Metadata object with `title`, `description`, `alternates` (canonical URL), `openGraph` (type 'article', `locale`, `siteName`, `url`, `title`, `description`, `images`, `publishedTime`, `modifiedTime`, `authors`), `twitter` (card, `title`, `description`, `images`), and `authors`; or an empty object if the slug is invalid or the article cannot be found.
 */
export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    try {
        const article = await fetchArticleBySlug(slug);
        if (!article) return {};

        const title = article.base.title;
        const description = article.base.description || undefined;
        const publishedTime = formatIso8601Date(getEffectiveDate(article));
        const bannerOrCoverMedia = pickBannerOrCoverMedia(article.base, article.categories);
        const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'medium') : undefined;
        const coverImage = optimizedMedia ? formatOpenGraphImage(optimizedMedia) : undefined;
        const authors = article.authors?.map((a) => a.title).filter(Boolean) as string[] | undefined;

        return {
            title,
            description,
            alternates: {
                canonical: absoluteRoute(`/artikel/${slug}`),
            },
            openGraph: {
                type: 'article',
                locale: OG_LOCALE,
                siteName: OG_SITE_NAME,
                url: absoluteRoute(`/artikel/${slug}`),
                title,
                description,
                images: coverImage,
                publishedTime,
                modifiedTime: formatIso8601Date(article.publishedAt),
                authors,
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: coverImage,
            },
            authors: authors?.map((name) => ({name})),
        };
    } catch (error) {
        // Log error but return empty metadata to allow page to render with defaults
        const errorMessage = getErrorMessage(error);

        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching article metadata for slug "${slug}":`, errorMessage);
        } else {
            console.error(`Error fetching article metadata for slug "${slug}":`, errorMessage);
        }

        return {};
    }
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
    if (!slug) return notFound();

    try {
        const article = await fetchArticleBySlug(slug);
        if (!article) return notFound();

        return <ArticleDetail slug={slug} article={article} />;
    } catch (error) {
        const errorMessage = getErrorMessage(error);

        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching article for slug "${slug}":`, errorMessage);
            // Return 404 for socket/timeout errors to trigger fallback behavior
            return notFound();
        }

        // Check if it's a 404 error
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            return notFound();
        }

        // Log other errors and return 404
        console.error(`Error fetching article for slug "${slug}":`, errorMessage);
        return notFound();
    }
}