'use client';

import Link from 'next/link';
import React from 'react';

import {isStaleChunkError} from '@/src/lib/errors';
import styles from '../src/styles/components/status.module.css';

const STALE_CHUNK_RELOAD_KEY = 'm10z-stale-chunk-reload';

export default function Error({
                                  error,
                                  reset,
                              }: {
    error: Error & {digest?: string};
    reset: () => void;
}) {
    React.useEffect(() => {
        if (!isStaleChunkError(error)) return;
        // A tab open across a deployment can reference JS chunks that no
        // longer exist under the new build; React's reset() re-renders with
        // the same (broken) bundle, so only a full reload recovers.
        // Guard with sessionStorage to avoid looping if the reload doesn't help.
        if (window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)) return;
        window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, '1');
        window.location.reload();
    }, [error]);

    return (
        <div className={styles.container}>
            <section className={styles.panel} aria-labelledby="error-title">
                <div className={styles.badge}>Oops</div>
                <h1 id="error-title" className={styles.title}>
                    Da ist etwas schiefgelaufen
                </h1>
                <p className={styles.body}>
                    Entschuldigung, ein unerwarteter Fehler ist aufgetreten. Versuche es bitte noch einmal oder gehe zur
                    Startseite zurück.
                </p>

                <div className={styles.actions}>
                    <button type="button" className={styles.primaryButton} onClick={reset}
                            data-umami-event="error-reset">
                        Neu laden
                    </button>
                    <Link className={styles.secondaryLink} href="/">
                        Zur Startseite
                    </Link>
                </div>
            </section>
        </div>
    );
}
