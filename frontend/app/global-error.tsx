'use client';

import {useEffect} from 'react';

import {isStaleChunkError} from '@/src/lib/errors';

const STALE_CHUNK_RELOAD_KEY = 'm10z-stale-chunk-reload';

/**
 * Catches errors thrown by the root layout itself (fonts, JSON-LD, imports).
 * Must render its own <html>/<body> since the root layout is unavailable.
 */
export default function GlobalError({
                                        error,
                                        reset,
                                    }: {
    error: Error & {digest?: string};
    reset: () => void;
}) {
    useEffect(() => {
        if (!isStaleChunkError(error)) return;
        // A tab open across a deployment can reference JS chunks that no
        // longer exist under the new build; only a full reload recovers.
        // Guard with sessionStorage to avoid looping if reload doesn't help.
        if (window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)) return;
        window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, '1');
        window.location.reload();
    }, [error]);

    return (
        <html lang="de">
        <body
            style={{
                margin: 0,
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: '48px 20px',
                background: '#111',
                color: '#eee',
            }}
        >
        <div style={{maxWidth: 600, textAlign: 'left'}}>
            <h1 style={{fontSize: '1.8rem', margin: '0 0 12px'}}>
                Da ist etwas schiefgelaufen
            </h1>
            <p style={{color: '#999', margin: '0 0 24px'}}>
                Entschuldigung, ein unerwarteter Fehler ist aufgetreten. Versuche es
                bitte noch einmal oder gehe zur Startseite.
            </p>
            <div style={{display: 'flex', gap: 10}}>
                <button
                    type="button"
                    onClick={reset}
                    style={{
                        padding: '10px 16px',
                        borderRadius: 6,
                        border: '1px solid #ff6b35',
                        background: '#ff6b35',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    Neu laden
                </button>
                <a
                    href="/"
                    style={{
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: '1px solid #333',
                        background: '#222',
                        color: '#eee',
                        textDecoration: 'none',
                        fontWeight: 600,
                    }}
                >
                    Zur Startseite
                </a>
            </div>
        </div>
        </body>
        </html>
    );
}
