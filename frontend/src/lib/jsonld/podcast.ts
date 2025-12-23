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
 * Converts a StrapiAuthor to a Person schema object.
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
 * Converts StrapiMedia to ImageObject or URL string.
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
 * Generates PodcastEpisode JSON-LD schema from a Strapi podcast.
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

