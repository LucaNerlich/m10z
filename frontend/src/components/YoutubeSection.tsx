'use client'

import {type StrapiYoutube} from '@/src/lib/rss/media';
import {extractYouTubeVideoId} from '@/src/lib/youtube';
import YoutubeEmbed from './YoutubeEmbed';
import styles from './YoutubeSection.module.css';

type YoutubeSectionProps = {
    youtube?: StrapiYoutube[] | null;
};

/**
 * Component for displaying a section of YouTube video embeds.
 *
 * Renders YouTube videos from a Strapi youtube array, extracting video IDs
 * and displaying them in a responsive grid layout.
 */
export function YoutubeSection({youtube}: YoutubeSectionProps) {
    if (!youtube || youtube.length === 0) return null;

    return (
        <div className={styles.youtubeSection}>
            {youtube.map((youtubeItem) => {
                const videoId = extractYouTubeVideoId(youtubeItem.url);
                if (!videoId) return null;
                return (
                    <YoutubeEmbed
                        key={youtubeItem.id}
                        videoId={videoId}
                        title={youtubeItem.title ?? undefined}
                    />
                );
            })}
        </div>
    );
}

