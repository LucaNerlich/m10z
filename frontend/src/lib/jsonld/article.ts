import {type BlogPosting, type ImageObject, type Person} from './types';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {buildImageObject, formatIso8601Date} from './helpers';
import {generateOrganizationJsonLd} from './organization';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickBannerMedia,
    pickCoverMedia,
    type StrapiAuthor,
    type StrapiMedia,
} from '@/src/lib/rss/media';


/**
 * Create a schema.org Person object from a Strapi author record.
 *
 * The returned Person includes a name (falls back to "Unknown Author"), a URL when the author has a slug,
 * and an image when the author has an avatar. If the avatar contains width and height, the image is an ImageObject;
 * otherwise the image is the avatar's absolute URL.
 *
 * @param author - The Strapi author record to convert
 * @returns A Person object suitable for JSON-LD embedding
 */
function authorToPerson(author: StrapiAuthor): Person {
    const name = author.title ?? 'Unknown Author';
    const person: Person = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
    };

    if (author.slug) {
        person.url = absoluteRoute(routes.author(author.slug));
    }

    if (author.avatar) {
        const avatarMedia = normalizeStrapiMedia(author.avatar);
        const avatarUrl = mediaUrlToAbsolute({media: avatarMedia});
        if (avatarUrl) {
            if (avatarMedia.width && avatarMedia.height) {
                person.image = buildImageObject(avatarUrl, avatarMedia.width, avatarMedia.height);
            } else {
                person.image = avatarUrl;
            }
        }
    }

    return person;
}

/**
 * Convert a Strapi media entry into an ImageObject or an absolute image URL.
 *
 * @param media - The Strapi media record to convert
 * @returns An ImageObject when `width` and `height` are present, the absolute image URL string when only a URL is available, or `undefined` if no usable URL exists
 */
function mediaToImage(media: StrapiMedia | undefined): ImageObject | string | undefined {
    if (!media?.url) return undefined;
    const url = mediaUrlToAbsolute({media});
    if (!url) return undefined;

    if (media.width && media.height) {
        return buildImageObject(url, media.width, media.height);
    }
    return url;
}

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
    if (bannerImage && bannerImage !== coverImage) images.push(bannerImage);

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
