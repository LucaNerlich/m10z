'use client';

import {useEffect, useRef, useState} from 'react';
import Script from 'next/script';

import {type PodloveEpisodeConfig, type PodlovePlayerConfig} from '@/src/lib/podlove/types';
import styles from './Player.module.css';

declare global {
    interface Window {
        podlovePlayer?: (
            element: string | HTMLElement,
            episode: PodloveEpisodeConfig | string,
            config: PodlovePlayerConfig | string,
        ) => Promise<unknown>;
    }
}

// Podlove Web Player embed script, loaded from the official CDN. The CDN build resolves its own
// runtime chunks relative to the CDN, so no `base` needs to be set in the player config.
const EMBED_SRC = 'https://cdn.podlove.org/web-player/5.x/embed.js';

type PlayerProps = {
    episode: PodloveEpisodeConfig | null;
    config: PodlovePlayerConfig;
};

/**
 * Renders the Podlove Web Player for a podcast episode.
 *
 * Mounts the Podlove embed into a container after the CDN script is ready and returns nothing when
 * no episode is provided.
 *
 * @param episode - Episode configuration to load.
 * @param config - Player configuration passed to the Podlove embed.
 * @returns The player container for `episode`, or `null` when no episode is provided.
 */
export function PodcastPlayer({episode, config}: PlayerProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [scriptReady, setScriptReady] = useState(
        () => typeof window !== 'undefined' && typeof window.podlovePlayer === 'function'
    );
    // The player can only mount client-side (it's a sandboxed iframe/Vue app). We keep it hidden
    // until its bootstrap promise resolves, then fade it in — so the internal boot flicker happens
    // behind a stable, correctly-sized placeholder instead of popping into view.
    const [playerReady, setPlayerReady] = useState(false);
    // Set when the CDN script fails to load or the player bootstrap errors, so we can fall back to a
    // native audio element instead of leaving the hidden (opacity 0) shell forever.
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !scriptReady || !episode || typeof window.podlovePlayer !== 'function') {
            return;
        }

        // Reset the container before (re)mounting to avoid duplicate players across client-side
        // navigation between episodes.
        container.replaceChildren();
        setPlayerReady(false);
        setFailed(false);

        let cancelled = false;
        try {
            window.podlovePlayer(container, episode, config)
                .then(() => {
                    if (!cancelled) setPlayerReady(true);
                })
                .catch((error: unknown) => {
                    if (!cancelled) {
                        console.error('Failed to initialize Podlove player:', error);
                        setFailed(true);
                    }
                });
        } catch (error) {
            console.error('Failed to initialize Podlove player:', error);
            setFailed(true);
        }

        return () => {
            cancelled = true;
            container.replaceChildren();
        };
    }, [scriptReady, episode, config]);

    if (!episode) return null;

    const audioSrc = episode.audio[0]?.url;

    // Fallback: if the player can't load, still offer playback + download via the (tracked) audio URL.
    if (failed) {
        return (
            <div className={styles.player}>
                {audioSrc ? (
                    <>
                        <audio
                            controls
                            preload='metadata'
                            className={styles.fallbackAudio}
                            aria-label='Podcast-Episode abspielen'>
                            <source src={audioSrc} type={episode.audio[0]?.mimeType ?? 'audio/mpeg'} />
                        </audio>
                        <a href={audioSrc} className={styles.fallbackDownload}>
                            Episode herunterladen
                        </a>
                    </>
                ) : null}
            </div>
        );
    }

    return (
        <div className={styles.player}>
            {/* Warm up the CDN connection early so embed.js + chunks load with less delay. */}
            <link rel='preconnect' href='https://cdn.podlove.org' crossOrigin='anonymous' />
            <Script
                src={EMBED_SRC}
                strategy='afterInteractive'
                onReady={() => setScriptReady(true)}
                onError={() => setFailed(true)}
            />
            <div
                ref={containerRef}
                className={`${styles.mount}${playerReady ? ` ${styles.mountReady}` : ''}`}
            />
        </div>
    );
}
