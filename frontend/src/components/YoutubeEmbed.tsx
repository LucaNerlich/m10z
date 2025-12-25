import React from 'react';

interface YoutubeEmbedProps {
    videoId: string;
    title?: string;
    width?: number;
    height?: number;
}

/**
 * Render an embedded YouTube video iframe based on the provided props.
 *
 * @param props.videoId - YouTube video identifier; when falsy the component renders an empty fragment.
 * @param props.title - Accessible title for the iframe; defaults to `'YouTube video player'`.
 * @param props.width - Width of the iframe in pixels; defaults to `560`.
 * @param props.height - Height of the iframe in pixels; defaults to `315`.
 * @returns A React element containing the YouTube embed iframe for the given `videoId`, or an empty fragment when `videoId` is falsy.
 */
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