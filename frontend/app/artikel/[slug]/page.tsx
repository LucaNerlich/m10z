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
import {pickCoverMedia, normalizeStrapiMedia, getOptimalMediaFormat, mediaUrlToAbsolute} from '@/src/lib/rss/media';
import {formatIso8601Date} from '@/src/lib/jsonld/helpers';

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
    const coverMedia = pickCoverMedia(article.base, article.categories);
    const coverImage = coverMedia ? formatOpenGraphImage(normalizeStrapiMedia(coverMedia)) : undefined;
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
    const coverMedia = pickCoverMedia(article.base, article.categories);
    const optimizedCoverMedia = coverMedia ? getOptimalMediaFormat(normalizeStrapiMedia(coverMedia), 'medium') : undefined;
    const coverImageUrl = optimizedCoverMedia ? mediaUrlToAbsolute({media: optimizedCoverMedia}) : undefined;
    const coverWidth = optimizedCoverMedia?.width;
    const coverHeight = optimizedCoverMedia?.height;

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
            />
            <main>
                <h2>TODO</h2>
                <p>{published ? new Date(published).toLocaleDateString('de-DE') : ''}</p>
                <h1>{article.base.title}</h1>
                {article.base.description ? <p>{article.base.description}</p> : null}
                {coverImageUrl && coverWidth && coverHeight ? (
                    <Image
                        src={coverImageUrl}
                        alt={article.base.title}
                        width={coverWidth}
                        height={coverHeight}
                        priority
                    />
                ) : null}
                <Markdown markdown={article.content ?? ''} />
            </main>
        </>
    );
}