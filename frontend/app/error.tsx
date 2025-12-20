'use client';

import Link from 'next/link';
import React from 'react';

import styles from './status.module.css';

export default function Error({
                                  reset,
                              }: {
    error: Error & {digest?: string};
    reset: () => void;
}) {
    return (
        <main className={styles.container}>
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
                    <button type="button" className={styles.primaryButton} onClick={reset}>
                        Neu laden
                    </button>
                    <Link className={styles.secondaryLink} href="/">
                        Zur Startseite
                    </Link>
                </div>
            </section>
        </main>
    );
}
