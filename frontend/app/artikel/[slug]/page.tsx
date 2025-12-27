'use cache';

import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {fetchArticleBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {getOptimalMediaFormat, mediaUrlToAbsolute, pickBannerOrCoverMedia} from '@/src/lib/rss/media';
import {formatIso8601Date} from '@/src/lib/jsonld/helpers';
import {calculateReadingTime} from '@/src/lib/readingTime';
import {ContentMetadata} from '@/src/components/ContentMetadata';
import {ContentImage} from '@/src/components/ContentImage';
import {Section} from '@/src/components/Section';
import {ContentLayout} from '@/app/ContentLayout';
import placeholderCover from '@/public/images/m10z.jpg';
import styles from './page.module.css';
import {MarkdownClient} from '@/src/components/MarkdownClient';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Builds metadata (OpenGraph, Twitter, authors, and alternates) for an article identified by slug.
 *
 * Returns an empty metadata object if the slug is invalid or the article cannot be found.
 *
 * @param params - Page route params containing a `slug` that identifies the article
 * @returns A Metadata object containing `title`, `description`, `alternates` (canonical URL), `openGraph` (type, title, description, images, publishedTime, modifiedTime, authors), `twitter` (card, title, description, images), and `authors`; or an empty object if metadata cannot be produced
 */
export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const article = await fetchArticleBySlug(slug);
    if (!article) return {};

    const title = article.base.title;
    const description = article.base.description || undefined;
    const publishedTime = formatIso8601Date(getEffectiveDate(article));
    const bannerOrCoverMedia = pickBannerOrCoverMedia(article.base, article.categories);
    const coverImage = bannerOrCoverMedia ? formatOpenGraphImage(bannerOrCoverMedia) : undefined;
    const authors = article.authors?.map((a) => a.title).filter(Boolean) as string[] | undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/artikel/${slug}`),
        },
        openGraph: {
            type: 'article',
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
}

/**
 * Renders the article detail page for a validated slug, embedding article JSON-LD and the article content.
 *
 * @param params - An object with a `slug` string identifying the article to render
 * @returns A React element containing a JSON-LD script and the main article view (published date, title, optional description, and rendered markdown content)
 */
export default async function ArticleDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const article = await fetchArticleBySlug(slug);
    if (!article) return notFound();

    const published = getEffectiveDate(article);
    const readingTime = calculateReadingTime(article.content ?? '');
    const bannerOrCoverMedia = pickBannerOrCoverMedia(article.base, article.categories);
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'large') : undefined;

    // Fallback configuration
    const fallbackSrc = placeholderCover;
    const fallbackWidth = 400;
    const fallbackHeight = 225;

    // Determine final values
    const mediaUrl = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : undefined;
    const imageSrc = mediaUrl ?? fallbackSrc;
    const imageWidth = optimizedMedia?.width ?? fallbackWidth;
    const imageHeight = optimizedMedia?.height ?? fallbackHeight;
    const placeholder = mediaUrl ? 'empty' : 'blur';

    return (
        <article className={styles.article}>
            <ContentLayout>
                <ContentImage
                    src={imageSrc}
                    alt={article.base.title}
                    width={imageWidth}
                    height={imageHeight}
                    placeholder={placeholder}
                />
                <Section className={styles.header}>
                    <ContentMetadata
                        publishedDate={published}
                        readingTime={readingTime}
                        authors={article.authors}
                        categories={article.categories}
                    />
                    <h1 className={styles.title}>{article.base.title}</h1>
                    {article.base.description ? (
                        <p className={styles.description}>
                            {article.base.description}
                        </p>
                    ) : null}
                </Section>

                <div className={styles.content}>
                    <MarkdownClient markdown={article.content ?? ''} />
                </div>
            </ContentLayout>
        </article>
    );
}
