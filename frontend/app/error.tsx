'use client';

import Link from 'next/link';
import React from 'react';

import {trackClientError} from '@/src/lib/analytics/clientErrorTracking';
import {isStaleChunkError} from '@/src/lib/errors';
import {reloadForStaleChunk} from '@/src/lib/staleChunkReload';
import styles from '../src/styles/components/status.module.css';

export default function Error({
                                  error,
                                  reset,
                              }: {
    error: Error & {digest?: string};
    reset: () => void;
}) {
    const staleChunk = isStaleChunkError(error);
    const [reloadBlocked, setReloadBlocked] = React.useState(false);

    React.useEffect(() => {
        // A stale chunk (tab open across a deployment, or HTML and chunks
        // served by different containers) cannot be fixed by reset(), which
        // re-renders with the same broken bundle — only a full reload recovers.
        const reloaded = staleChunk ? reloadForStaleChunk() : false;
        trackClientError(error, {source: 'error-boundary', reloaded, staleChunk});
        if (staleChunk && !reloaded) setReloadBlocked(true);
    }, [error, staleChunk]);

    // While the recovery reload is pending, render a neutral placeholder so the
    // error UI does not flash before the working page loads.
    if (staleChunk && !reloadBlocked) {
        return <div className={styles.container} aria-busy='true' />;
    }

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
