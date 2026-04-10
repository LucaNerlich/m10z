'use client';

import Link from 'next/link';

import styles from '@/src/styles/components/status.module.css';

export default function M12GError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
    return (
        <div className={styles.container}>
            <section className={styles.panel} aria-labelledby="error-title">
                <div className={styles.badge}>Fehler</div>
                <h1 id="error-title" className={styles.title}>
                    Seite konnte nicht geladen werden
                </h1>
                <p className={styles.body}>
                    Bitte versuche es erneut oder gehe zur Startseite.
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
        </div>
    );
}
