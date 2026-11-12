'use client';

import {useEffect, useReducer, useRef, useState} from 'react';
import Script from 'next/script';

import {type PodloveEpisodeConfig, type PodlovePlayerConfig, type PodlovePlayerStore} from '@/src/lib/podlove/types';
import {initialPlayerPhase, playerReducer} from './playerState';
import styles from './Player.module.css';

declare global {
    interface Window {
        podlovePlayer?: (
            element: string | HTMLElement,
            episode: PodloveEpisodeConfig | string,
            config: PodlovePlayerConfig | string,
        ) => Promise<PodlovePlayerStore>;
    }
}

// Podlove Web Player embed script, loaded from the official CDN. The CDN build resolves its own
// runtime chunks relative to the CDN, so no `base` needs to be set in the player config.
const EMBED_SRC = 'https://cdn.podlove.org/web-player/5.x/embed.js';

type PlayerProps = {
    episode: PodloveEpisodeConfig | null;
    config: PodlovePlayerConfig;
};

function hasPodlovePlayer(): boolean {
    return typeof window !== 'undefined' && typeof window.podlovePlayer === 'function';
}

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
    // The player can only mount client-side (it's a sandboxed iframe/Vue app). It stays hidden
    // until its bootstrap promise resolves, then fades in — so the internal boot flicker happens
    // behind a stable, correctly-sized placeholder instead of popping into view.
    const [phase, dispatch] = useReducer(playerReducer, undefined, () =>
        initialPlayerPhase(hasPodlovePlayer()),
    );

    // Client-side navigation reuses this component. Reset before rendering the
    // new episode so the old embed is replaced instead of reused.
    const [prevInputs, setPrevInputs] = useState({episode, config});
    if (episode !== prevInputs.episode || config !== prevInputs.config) {
        setPrevInputs({episode, config});
        dispatch({type: 'reset', hasEmbed: hasPodlovePlayer()});
    }

    useEffect(() => {
        if (phase !== 'booting' || !episode) return;
        const container = containerRef.current;
        if (!container) return;
        if (typeof window.podlovePlayer !== 'function') {
            dispatch({type: 'player-failed'});
            return;
        }

        // Clear any previous embed before mounting the current episode.
        container.replaceChildren();
        let cancelled = false;
        const fail = (error: unknown) => {
            if (cancelled) return;
            console.error('Failed to initialize Podlove player:', error);
            dispatch({type: 'player-failed'});
        };

        try {
            window.podlovePlayer(container, episode, config)
                .then(() => {
                    if (!cancelled) dispatch({type: 'player-ready'});
                })
                .catch(fail);
        } catch (error) {
            fail(error);
        }

        return () => {
            cancelled = true;
        };
    }, [phase, episode, config]);

    // Drop the embed when the episode changes or the component unmounts so a
    // playing episode cannot continue from a detached container.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        return () => container.replaceChildren();
    }, [episode]);

    if (!episode) return null;

    const audioSrc = episode.audio[0]?.url;

    // Fallback: if the player can't load, still offer playback + download via the (tracked) audio URL.
    if (phase === 'fallback') {
        return (
            <div className={styles.player}>
                {audioSrc ? (
                    <>
                        <audio
                            controls
                            preload="metadata"
                            className={styles.fallbackAudio}
                            aria-label="Podcast-Episode abspielen">
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
            {phase !== 'ready' ? (
                <p className="visually-hidden" role="status">
                    Player wird geladen …
                </p>
            ) : null}
            {/* Warm up the CDN connection early so embed.js + chunks load with less delay. */}
            <link rel="preconnect" href="https://cdn.podlove.org" crossOrigin="anonymous" />
            <div className="podlove-container">
                <Script
                    src={EMBED_SRC}
                    strategy="afterInteractive"
                    onReady={() =>
                        dispatch({
                            type: typeof window.podlovePlayer === 'function' ? 'embed-loaded' : 'embed-missing',
                        })
                    }
                    onError={() => dispatch({type: 'player-failed'})}
                />
                <div
                    ref={containerRef}
                    className={`${styles.mount}${phase === 'ready' ? ` ${styles.mountReady}` : ''}`}
                    aria-busy={phase !== 'ready'}
                />
            </div>
        </div>
    );
}
