import {type BlogPosting, type ImageObject, type Person} from './types';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {authorToPerson, formatIso8601Date, imagesEqual, mediaToImage} from './helpers';
import {deriveExcerpt, stripMarkdown} from '@/src/lib/metadata/excerpt';
import {generateOrganizationJsonLd} from './organization';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {pickBannerMedia, pickCoverMedia} from '@/src/lib/rss/media';
import {CONTENT_LANGUAGE} from '@/src/lib/metadata/constants';
import {categoryTitlesToKeywords, primaryCategoryTitle} from '@/src/lib/metadata/keywords';

/**
 * Builds a Schema.org BlogPosting JSON-LD object for the provided Strapi article.
 *
 * @param article - The Strapi article to convert into JSON-LD.
 * @returns A `BlogPosting` object containing headline, description, publication and modification dates, article body, URL, image(s) when available, author(s) when available, publisher, and mainEntityOfPage.
 */
export function generateArticleJsonLd(article: StrapiArticle): BlogPosting {
    const effectiveDate = getEffectiveDate(article);
    const datePublished = formatIso8601Date(effectiveDate);
    const dateModified = formatIso8601Date(article.publishedAt) ?? datePublished;

    const articleUrl = absoluteRoute(routes.article(article.slug));

    const coverMedia = pickCoverMedia(article, article.categories);
    const bannerMedia = pickBannerMedia(article, article.categories);

    const images: (ImageObject | string)[] = [];
    const coverImage = mediaToImage(coverMedia);
    if (coverImage) images.push(coverImage);
    const bannerImage = mediaToImage(bannerMedia);
    if (bannerImage && !imagesEqual(bannerImage, coverImage)) images.push(bannerImage);

    const authors: Person[] | undefined = article.authors?.length
        ? article.authors.map((author) => authorToPerson(author))
        : undefined;

    const publisher = generateOrganizationJsonLd();

    const description = article.description?.trim() || deriveExcerpt(article.content);
    const articleSection = primaryCategoryTitle(article.categories);

    const MAX_ARTICLE_BODY_CHARS = 10_000;
    const rawBody = article.content ? stripMarkdown(article.content) : undefined;
    const articleBody = rawBody
        ? rawBody.length <= MAX_ARTICLE_BODY_CHARS
            ? rawBody
            : rawBody.slice(0, MAX_ARTICLE_BODY_CHARS).replace(/\s\S*$/, '')
        : undefined;
    const keywords = categoryTitlesToKeywords(article.categories);
    const wordCount = typeof article.wordCount === 'number' && article.wordCount > 0 ? article.wordCount : undefined;

    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description,
        articleBody,
        datePublished: datePublished ?? dateModified,
        dateModified,
        articleSection,
        keywords,
        wordCount,
        inLanguage: CONTENT_LANGUAGE,
        url: articleUrl,
        image: images.length > 0 ? images : undefined,
        author: authors,
        publisher,
        mainEntityOfPage: articleUrl,
    };
}
