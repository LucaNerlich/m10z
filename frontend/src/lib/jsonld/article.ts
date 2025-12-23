import {type BlogPosting, type ImageObject, type Person} from './types';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {authorToPerson, formatIso8601Date, imagesEqual, mediaToImage} from './helpers';
import {generateOrganizationJsonLd} from './organization';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {pickBannerMedia, pickCoverMedia} from '@/src/lib/rss/media';

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

    const coverMedia = pickCoverMedia(article.base, article.categories);
    const bannerMedia = pickBannerMedia(article.base, article.categories);

    const images: (ImageObject | string)[] = [];
    const coverImage = mediaToImage(coverMedia);
    if (coverImage) images.push(coverImage);
    const bannerImage = mediaToImage(bannerMedia);
    if (bannerImage && !imagesEqual(bannerImage, coverImage)) images.push(bannerImage);

    const authors: Person[] | undefined = article.authors?.length
        ? article.authors.map((author) => authorToPerson(author))
        : undefined;

    const publisher = generateOrganizationJsonLd();

    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.base.title,
        description: article.base.description ?? undefined,
        datePublished: datePublished ?? new Date().toISOString(),
        dateModified,
        articleBody: article.content || undefined,
        url: articleUrl,
        image: images.length > 0 ? images : undefined,
        author: authors,
        publisher,
        mainEntityOfPage: articleUrl,
    };
}
