import React from 'react';
import {toYouTubeEmbedUrl} from '@/src/lib/youtube';

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

    // Validate videoId by constructing a watch URL and using toYouTubeEmbedUrl helper
    // This ensures the videoId matches YouTube's expected format
    const watchUrl = `https://www.youtube.com/watch?v=${props.videoId}`;
    const embedUrl = toYouTubeEmbedUrl(watchUrl, true);

    // If validation fails, return empty element
    if (!embedUrl) return <></>;

    return (
        <>
            {props.title && <h2>{props.title}</h2>}
            <div>
                <iframe
                    width={props.width ?? 560}
                    height={props.height ?? 315}
                    src={embedUrl}
                    title={props.title ?? 'YouTube video player'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                />
            </div>
        </>
    );
}
