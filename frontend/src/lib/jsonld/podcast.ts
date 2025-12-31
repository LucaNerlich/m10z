import {type AudioObject, type Person, type PodcastEpisode, type PodcastSeries} from './types';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {authorToPerson, formatIso8601Date, formatIso8601Duration, mediaToImage} from './helpers';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {mediaUrlToAbsolute, normalizeStrapiMedia, pickCoverOrBannerMedia} from '@/src/lib/rss/media';

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

    const coverMedia = pickCoverOrBannerMedia(podcast.base, podcast.categories);
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
        datePublished: datePublished,
        duration,
        associatedMedia,
        image: coverImage ? [coverImage] : undefined,
        author: authors,
        partOfSeries,
        url: podcastUrl,
    };
}
