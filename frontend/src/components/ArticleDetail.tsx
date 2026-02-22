import Script from 'next/script';

import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {getOptimalMediaFormat, mediaUrlToAbsolute, pickBannerOrCoverMedia} from '@/src/lib/rss/media';
import {calculateReadingTime} from '@/src/lib/readingTime';
import {extractHeadings} from '@/src/lib/markdown/extractHeadings';
import {ContentMetadata} from '@/src/components/ContentMetadata';
import {ContentImage} from '@/src/components/ContentImage';
import {TableOfContents} from '@/src/components/TableOfContents';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {YoutubeSection} from '@/src/components/YoutubeSection';
import {generateArticleJsonLd} from '@/src/lib/jsonld/article';
import placeholderCover from '@/public/images/m10z.jpg';
import styles from '@/app/artikel/[slug]/page.module.css';

// Hoist RegExp pattern to module scope
const REGEX_LT_ESCAPE = /</g;

type ArticleDetailProps = {
    slug: string;
    article: StrapiArticle | null;
};

/**
 * Render the article detail view using the provided article data.
 *
 * Renders the article element with an optimized or fallback image, content metadata (published date, reading time, authors, categories),
 * the article title and optional description, the rendered Markdown content, an optional YouTube section, and embedded JSON-LD.
 *
 * @param slug - The article slug
 * @param article - Server-provided article data to render; if `null` or `undefined`, the component returns `null`
 * @returns The article element populated with image, metadata, content, and structured JSON-LD, or `null` if `article` is missing
 */
export function ArticleDetail({slug, article: initialArticle}: ArticleDetailProps) {
    const article = initialArticle;
    if (!article) return null;

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
    const blurhash = optimizedMedia?.blurhash ?? null;
    const placeholder = blurhash ? 'blur' : 'empty';
    const imageAlt = optimizedMedia?.alternativeText ?? article.base.title;
    const imageTitle = optimizedMedia?.caption ?? undefined;
    const jsonLd = generateArticleJsonLd(article);
    const content = article.content ?? '';
    const headings = extractHeadings(content, 3);
    const hasToc = headings.length >= 4;

    const articleElement = (
        <article className={styles.article}>
            <Script
                id={`jsonld-article-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(REGEX_LT_ESCAPE, '\\u003c'),
                }}
            />

            <ContentImage
                src={imageSrc}
                alt={imageAlt}
                title={imageTitle}
                width={imageWidth}
                height={imageHeight}
                placeholder={placeholder}
                blurhash={blurhash}
                priority={true}
            />
            <section className={styles.header}>
                <ContentMetadata
                    publishedDate={published}
                    readingTime={readingTime}
                    authors={article.authors}
                    categories={article.categories}
                />
                <h1 className={styles.title}>{article.base.title}</h1>
            </section>

            <Markdown markdown={content} />

            {article.youtube && article.youtube.length > 0 && <YoutubeSection youtube={article.youtube} />}
        </article>
    );

    if (!hasToc) return articleElement;

    return (
        <div className={styles.withToc} data-article-toc>
            {articleElement}
            <TableOfContents headings={headings} />
        </div>
    );
}
