'use cache';

import {type Metadata} from 'next';
import {notFound} from 'next/navigation';
import Image from 'next/image';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {fetchArticleBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {generateArticleJsonLd} from '@/src/lib/jsonld/article';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {getOptimalMediaFormat, mediaUrlToAbsolute, pickBannerOrCoverMedia} from '@/src/lib/rss/media';
import {formatIso8601Date} from '@/src/lib/jsonld/helpers';
import {formatDateShort} from '@/src/lib/dateFormatters';
import {ContentAuthors} from '@/src/components/ContentAuthors';
import {CategoryList} from '@/src/components/CategoryList';
import styles from './page.module.css';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    'use cache';
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
    const jsonLd = generateArticleJsonLd(article);
    const bannerOrCoverMedia = pickBannerOrCoverMedia(article.base, article.categories);
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'medium') : undefined;
    const coverImageUrl = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : undefined;
    const coverWidth = optimizedMedia?.width;
    const coverHeight = optimizedMedia?.height;

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
            />
            <main>
                <article className={styles.article}>
                    {coverImageUrl && coverWidth && coverHeight ? (
                        <div className={styles.coverImageContainer}>
                            <Image
                                src={coverImageUrl}
                                alt={article.base.title}
                                width={coverWidth}
                                height={coverHeight}
                                priority
                                className={styles.coverImage}
                            />
                        </div>
                    ) : null}
                    <header className={styles.header}>
                        {published ? (
                            <time dateTime={published} className={styles.publishedDate}>
                                {formatDateShort(published)}
                            </time>
                        ) : null}
                        <h1 className={styles.title}>{article.base.title}</h1>
                        {article.base.description ? (
                            <p className={styles.description}>
                                {article.base.description}
                            </p>
                        ) : null}
                        <div className={styles.metaRow}>
                            {article.authors && article.authors.length > 0 ? (
                                <ContentAuthors authors={article.authors} />
                            ) : null}
                            {article.categories && article.categories.length > 0 ? (
                                <CategoryList categories={article.categories} />
                            ) : null}
                        </div>
                    </header>
                    <div className={styles.content}>
                        <Markdown markdown={article.content ?? ''} />
                    </div>
                </article>
            </main>
        </>
    );
}
