import ReactPlayer from 'react-player';

type PlayerProps = {
    src: string;
};

export function PodcastPlayer({src}: PlayerProps) {
    if (!src) return null;
    return (
        <ReactPlayer
            {...({src: src, width: '100%', height: '50px', controls: true} as unknown as Record<string, unknown>)}
        />
    );
}

