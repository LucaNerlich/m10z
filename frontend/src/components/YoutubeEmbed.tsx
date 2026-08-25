import React from 'react';
import {toYouTubeEmbedUrl} from '@/src/lib/youtube';

interface YoutubeEmbedProps {
    videoId: string;
    title?: string;
    width?: number;
    height?: number;
}

/**
 * Renders an embedded YouTube iframe for a given video ID.
 *
 * @param props.videoId - YouTube video identifier; when falsy or invalid the component renders an empty fragment.
 * @param props.title - Accessible title for the iframe; used as the iframe title and optionally rendered as an `h2` above the iframe.
 * @param props.width - Width of the iframe in pixels; defaults to `560`.
 * @param props.height - Height of the iframe in pixels; defaults to `315`.
 * @returns A React element containing the YouTube embed iframe for the given `videoId`, or an empty fragment when `videoId` is falsy or invalid.
 */
export default function YoutubeEmbed(props: Readonly<YoutubeEmbedProps>): React.ReactElement {
    if (!props.videoId) return <></>;

    // Round-trip the id through toYouTubeEmbedUrl to reject malformed video ids.
    const watchUrl = `https://www.youtube.com/watch?v=${props.videoId}`;
    const embedUrl = toYouTubeEmbedUrl(watchUrl, true);

    if (!embedUrl) return <></>;

    return (
        <>
            {props.title && <h3>{props.title}</h3>}
            <div>
                <iframe
                    width={props.width ?? 560}
                    height={props.height ?? 315}
                    src={embedUrl}
                    title={props.title ?? 'YouTube video player'}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    loading="lazy"
                />
            </div>
        </>
    );
}