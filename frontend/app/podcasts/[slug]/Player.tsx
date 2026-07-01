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
 * Podlove Web Player for podcast episodes.
 *
 * Loads the self-hosted embed script and mounts the sandboxed player (an iframe managed by the
 * Podlove runtime) into a container element. The audio URL inside `episode` may point at the
 * download-tracking endpoint, so on-site plays/downloads are recorded just like RSS enclosures.
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

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !scriptReady || !episode || typeof window.podlovePlayer !== 'function') {
            return;
        }

        // Reset the container before (re)mounting to avoid duplicate players across client-side
        // navigation between episodes.
        container.replaceChildren();
        setPlayerReady(false);

        let cancelled = false;
        window.podlovePlayer(container, episode, config)
            .then(() => {
                if (!cancelled) setPlayerReady(true);
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    console.error('Failed to initialize Podlove player:', error);
                }
            });

        return () => {
            cancelled = true;
            container.replaceChildren();
        };
    }, [scriptReady, episode, config]);

    if (!episode) return null;

    return (
        <div className={styles.player}>
            {/* Warm up the CDN connection early so embed.js + chunks load with less delay. */}
            <link rel='preconnect' href='https://cdn.podlove.org' crossOrigin='anonymous' />
            <Script src={EMBED_SRC} strategy='afterInteractive' onReady={() => setScriptReady(true)} />
            <div
                ref={containerRef}
                className={`${styles.mount}${playerReady ? ` ${styles.mountReady}` : ''}`}
            />
        </div>
    );
}
