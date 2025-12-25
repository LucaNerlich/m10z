import React from 'react';

interface YoutubeEmbedProps {
    videoId: string;
    title?: string;
    width?: number;
    height?: number;
}

export default function YoutubeEmbed(props: Readonly<YoutubeEmbedProps>): React.ReactElement {
    if (!props.videoId) return <></>;

    return (
        <div>
            <iframe
                width={props.width ?? 560}
                height={props.height ?? 315}
                src={`https://www.youtube-nocookie.com/embed/${props.videoId}`}
                title={props.title ?? 'YouTube video player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
            />
        </div>
    );
}
