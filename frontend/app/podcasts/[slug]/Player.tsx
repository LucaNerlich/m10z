import styles from './Player.module.css';

type PlayerProps = {
    src: string;
};

/**
 * Native audio player for podcast episodes.
 * Uses the HTML5 audio element instead of react-player to reduce bundle size.
 * The native audio element provides all necessary controls without requiring
 * additional JavaScript libraries.
 */
export function PodcastPlayer({src}: PlayerProps) {
    if (!src) return null;

    return (
        <div className={styles.player}>
            <audio
                controls
                preload="metadata"
                style={{width: '100%'}}
            >
                <source src={src} />
                Your browser does not support the audio element.
            </audio>
        </div>
    );
}