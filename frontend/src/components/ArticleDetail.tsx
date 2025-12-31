'use client';

import {useArticle} from '@/src/hooks/useStrapiContent';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {getOptimalMediaFormat, mediaUrlToAbsolute, pickBannerOrCoverMedia} from '@/src/lib/rss/media';
import {calculateReadingTime} from '@/src/lib/readingTime';
import {ContentMetadata} from '@/src/components/ContentMetadata';
import {ContentImage} from '@/src/components/ContentImage';
import {Section} from '@/src/components/Section';
import {MarkdownClient} from '@/src/components/MarkdownClient';
import {YoutubeSection} from '@/src/components/YoutubeSection';
import {generateArticleJsonLd} from '@/src/lib/jsonld/article';
import placeholderCover from '@/public/images/m10z.jpg';
import styles from '@/app/artikel/[slug]/page.module.css';

type ArticleDetailProps = {
    slug: string;
    article: StrapiArticle | null;
};

/**
 * Client component for displaying article detail pages.
 * Uses SWR hook with initialData for server-side hydration.
 */
export function ArticleDetail({slug, article: initialArticle}: ArticleDetailProps) {
    const {data: article, error, isLoading} = useArticle(slug, initialArticle);

    // Show loading state only if we don't have initial data
    if (isLoading && !article) {
        return (
            <article className={styles.article}>
                <div style={{padding: '2rem', textAlign: 'center'}}>Lade Artikel...</div>
            </article>
        );
    }

    // Handle errors
    if (error || !article) {
        return (
            <article className={styles.article}>
                <Section>
                    <p>Fehler beim Laden des Artikels.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{marginTop: '1rem', padding: '0.5rem 1rem'}}
                    >
                        Erneut versuchen
                    </button>
                </Section>
            </article>
        );
    }

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
    const jsonLd = generateArticleJsonLd(article);

    return (
        <article className={styles.article}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
                }}
            />

            <ContentImage
                src={imageSrc}
                alt={article.base.title}
                width={imageWidth}
                height={imageHeight}
                placeholder={placeholder}
                blurhash={blurhash}
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
                    <p className={styles.description}>{article.base.description}</p>
                ) : null}
            </Section>

            <MarkdownClient markdown={article.content ?? ''} />

            {article.youtube && article.youtube.length > 0 && <YoutubeSection youtube={article.youtube} />}
        </article>
    );
}

