import ReactPlayer from 'react-player';
import styles from './Player.module.css';

type PlayerProps = {
    src: string;
};

export function PodcastPlayer({src}: PlayerProps) {
    if (!src) return null;
    return (
        <div className={styles.player}>
            <ReactPlayer
                {...({src: src, width: '100%', height: '50px', controls: true} as unknown as Record<string, unknown>)}
            />
        </div>
    );
}

