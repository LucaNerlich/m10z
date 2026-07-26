import {type StrapiYoutube} from '@/src/lib/strapi/media';
import {extractYouTubeVideoId} from '@/src/lib/youtube';
import styles from './YoutubeSection.module.css';
import YoutubeEmbed from '@/src/components/YoutubeEmbed';

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
    if (!youtube || youtube.length === 0) return <></>;

    const validVideos = youtube
        .map((item) => ({item, videoId: extractYouTubeVideoId(item.url)}))
        .filter((entry): entry is {item: StrapiYoutube; videoId: string} => entry.videoId !== null);

    if (validVideos.length === 0) return <></>;

    return (
        <section className={styles.youtubeSection}>
            <h2>YouTube-Videos</h2>
            {validVideos.map(({item, videoId}) => (
                <YoutubeEmbed
                    key={item.id}
                    videoId={videoId}
                    title={item.title ?? undefined}
                />
            ))}
        </section>
    );
}

