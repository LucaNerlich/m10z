import {type AudioObject, type ImageObject, type Person, type PodcastEpisode, type PodcastSeries} from './types';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {buildImageObject, formatIso8601Date, formatIso8601Duration} from './helpers';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickCoverMedia,
    type StrapiAuthor,
    type StrapiMedia,
} from '@/src/lib/rss/media';


/**
 * Build a Schema.org Person object from a StrapiAuthor.
 *
 * @param author - The Strapi author record to convert; may include title, slug, and avatar media
 * @returns A `Person` object with `name`, optional `url` (if `slug` exists), and optional `image` (an `ImageObject` when avatar dimensions are available, otherwise an image URL)
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
 * Produce a usable image representation from Strapi media when possible.
 *
 * @param media - The Strapi media object to convert; may be undefined.
 * @returns `ImageObject` when the media provides width and height, the absolute URL string when only a URL is available, or `undefined` if no usable URL can be resolved.
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
 * Create a Schema.org PodcastEpisode JSON-LD object from Strapi podcast data.
 *
 * @param podcast - The Strapi podcast record to convert into JSON-LD
 * @returns A PodcastEpisode JSON-LD object with fields populated from the Strapi podcast:
 *          name, optional description, datePublished (ISO 8601), duration (ISO 8601),
 *          optional associatedMedia when an audio file is available, optional image when a cover exists,
 *          optional author array when authors are provided, partOfSeries, and url
 */
export function generatePodcastJsonLd(podcast: StrapiPodcast): PodcastEpisode {
    const effectiveDate = getEffectiveDate(podcast);
    const datePublished = formatIso8601Date(effectiveDate);
    const duration = formatIso8601Duration(podcast.duration);

    const podcastUrl = absoluteRoute(routes.podcast(podcast.slug));

    const fileMedia = normalizeStrapiMedia(podcast.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia});

    const associatedMedia: AudioObject | undefined = audioUrl
        ? {
            '@context': 'https://schema.org',
            '@type': 'AudioObject',
            contentUrl: audioUrl,
            encodingFormat: fileMedia.mime ?? 'audio/mpeg',
            duration,
        }
        : undefined;

    const coverMedia = pickCoverMedia(podcast.base, podcast.categories);
    const coverImage = mediaToImage(coverMedia);

    const authors: Person[] | undefined = podcast.authors?.length
        ? podcast.authors.map((author) => authorToPerson(author))
        : undefined;

    const partOfSeries: PodcastSeries = {
        '@context': 'https://schema.org',
        '@type': 'PodcastSeries',
        name: 'M10Z Podcasts',
        url: absoluteRoute(routes.podcasts),
    };

    return {
        '@context': 'https://schema.org',
        '@type': 'PodcastEpisode',
        name: podcast.base.title,
        description: podcast.base.description ?? undefined,
        datePublished: datePublished ?? new Date().toISOString(),
        duration,
        associatedMedia,
        image: coverImage ? [coverImage] : undefined,
        author: authors,
        partOfSeries,
        url: podcastUrl,
    };
}
