import {type AudioObject, type PodcastEpisode, type PodcastSeries} from './types';
import {type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {authorsToPeople, formatIso8601Date, formatIso8601Duration, mediaToImage} from './helpers';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickAndOptimizeImage,
} from '@/src/lib/strapi/media';
import {deriveContentDescription} from '@/src/lib/metadata/excerpt';
import {CONTENT_LANGUAGE} from '@/src/lib/metadata/constants';
import {categoryTitlesToKeywords} from '@/src/lib/metadata/keywords';

/**
 * Create a Schema.org PodcastEpisode JSON-LD object from a Strapi podcast record.
 *
 * @param podcast - The Strapi podcast record to convert
 * @returns A PodcastEpisode JSON-LD object representing the episode, including name, optional description, datePublished (ISO 8601), duration (ISO 8601), optional `associatedMedia` (AudioObject) when an audio file is available, optional `image` array when a cover exists, optional `author` array, `partOfSeries`, and `url`
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

    const {media: optimizedMedia} = pickAndOptimizeImage(podcast, podcast.categories, 'medium', 'cover');
    const coverImage = mediaToImage(optimizedMedia);

    const authors = authorsToPeople(podcast.authors);

    const partOfSeries: PodcastSeries = {
        '@context': 'https://schema.org',
        '@type': 'PodcastSeries',
        name: 'M10Z Podcasts',
        url: absoluteRoute(routes.podcasts),
        image: absoluteRoute('/images/m10z.jpg'),
    };

    const description = deriveContentDescription(podcast.description, podcast.shownotes);
    const keywords = categoryTitlesToKeywords(podcast.categories);

    return {
        '@context': 'https://schema.org',
        '@type': 'PodcastEpisode',
        name: podcast.title,
        description,
        datePublished: datePublished,
        duration,
        keywords,
        inLanguage: CONTENT_LANGUAGE,
        associatedMedia,
        image: coverImage ? [coverImage] : undefined,
        author: authors,
        partOfSeries,
        url: podcastUrl,
    };
}