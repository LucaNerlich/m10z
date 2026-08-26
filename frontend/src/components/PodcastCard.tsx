import {type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {formatDuration} from '@/src/lib/dateFormatters';
import {routes} from '@/src/lib/routes';
import {MusicNoteIcon} from '@phosphor-icons/react/dist/ssr';

import {ContentCard} from './ContentCard';
import cardStyles from './ContentCard.module.css';

type PodcastCardProps = {
    podcast: StrapiPodcast;
    showAuthors?: boolean;
    showCategories?: boolean;
    descriptionLines?: number;
    className?: string;
};

/**
 * Card component for displaying podcast episode previews.
 *
 * Episode-specific bits (duration chip, "Anhören" CTA) are mapped onto the shared `ContentCard` layout.
 */
export function PodcastCard({
                                podcast,
                                showAuthors = false,
                                showCategories = false,
                                descriptionLines = 3,
                                className,
                            }: PodcastCardProps) {
    return (
        <ContentCard
            title={podcast.title}
            description={podcast.description}
            date={getEffectiveDate(podcast)}
            cover={podcast.cover}
            banner={podcast.banner}
            categories={podcast.categories}
            authors={podcast.authors}
            href={routes.podcast(podcast.slug)}
            mediaAltPrefix="Podcast-Cover"
            ctaLabel="Anhören"
            meta={podcast.duration ? (
                <span className={cardStyles.duration}>
                    <MusicNoteIcon size={14} aria-hidden='true' />
                    &nbsp;{formatDuration(podcast.duration)}
                </span>
            ) : null}
            showAuthors={showAuthors}
            showCategories={showCategories}
            descriptionLines={descriptionLines}
            className={className}
        />
    );
}
