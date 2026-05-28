import styles from './Player.module.css';

type PlayerProps = {
    src?: string;
    // `none` defers loading (and the tracked request) until the user presses play; `metadata`
    // fetches enough to show duration/seekbar up front.
    preload?: 'none' | 'metadata' | 'auto';
};

/**
 * Native audio player for podcast episodes.
 * Uses the HTML5 audio element instead of react-player to reduce bundle size.
 * The native audio element provides all necessary controls without requiring
 * additional JavaScript libraries.
 */
export function PodcastPlayer({src, preload = 'metadata'}: PlayerProps) {
    if (!src) return null;

    return (
        <div className={styles.player}>
            <audio
                controls
                preload={preload}
                aria-label="Podcast-Episode abspielen"
                style={{width: '100%'}}
            >
                <source src={src} type="audio/mpeg" />
                Your browser does not support the audio element.
            </audio>
        </div>
    );
}