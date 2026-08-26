import {type StrapiArticle} from '@/src/lib/strapi/contentTypes';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {pickAndOptimizeImage} from '@/src/lib/strapi/media';
import {calculateReadingTime} from '@/src/lib/readingTime';
import {extractHeadings} from '@/src/lib/markdown/extractHeadings';
import {ContentMetadata} from '@/src/components/ContentMetadata';
import {ContentHeroImage} from '@/src/components/ContentHeroImage';
import {JsonLdScripts} from '@/src/components/JsonLdScripts';
import {TableOfContents} from '@/src/components/TableOfContents';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {YoutubeSection} from '@/src/components/YoutubeSection';
import {generateArticleJsonLd} from '@/src/lib/jsonld/article';
import {generateBreadcrumbJsonLd} from '@/src/lib/jsonld/breadcrumb';
import styles from '@/app/artikel/[slug]/page.module.css';

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
    const {media: optimizedMedia} = pickAndOptimizeImage(article, article.categories, 'large');

    const jsonLd = generateArticleJsonLd(article);
    const breadcrumbItems = [
        {name: 'Startseite', path: '/'},
        {name: 'Artikel', path: '/artikel'},
        {name: article.title, path: `/artikel/${slug}`},
    ];
    const breadcrumbJsonLd = generateBreadcrumbJsonLd(breadcrumbItems);
    const content = article.content ?? '';
    const headings = extractHeadings(content, 3);
    // Only render the table of contents for articles with enough structure (4+ headings).
    const hasToc = headings.length >= 4;

    const articleElement = (
        <article className={styles.article}>
            <JsonLdScripts
                entries={[
                    {id: `jsonld-article-${slug}`, jsonLd},
                    {id: `jsonld-breadcrumb-${slug}`, jsonLd: breadcrumbJsonLd},
                ]}
            />

            <ContentHeroImage media={optimizedMedia} fallbackAlt={article.title} />
            <section className={styles.header}>
                <ContentMetadata
                    publishedDate={published}
                    readingTime={readingTime}
                    authors={article.authors}
                    categories={article.categories}
                />
                <h1 className={styles.title}>{article.title}</h1>
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
