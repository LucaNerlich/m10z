import {Metadata} from 'next';
import Link from 'next/link';

import styles from '../src/styles/components/status.module.css';

export const metadata: Metadata = {
    title: 'Seite nicht gefunden | m10z',
    description: 'Die gesuchte Seite wurde nicht gefunden. Entdecken Sie unser Angebot auf einer unserer anderen Seiten.',
    robots: {
        index: false,
        follow: true,
    },
};

export default function NotFound() {
    return (
        <main className={styles.container}>
            <section className={styles.panel} aria-labelledby="not-found-title">
                <div className={styles.badge}>404</div>
                <h1 id="not-found-title" className={styles.title}>
                    Seite nicht gefunden
                </h1>
                <p className={styles.body}>
                    Wir konnten die angeforderte Seite nicht finden. Vielleicht hilft dir unsere Startseite oder der Blick
                    in die Artikel und Podcasts.
                </p>

                <div className={styles.actions}>
                    <Link className={styles.primaryButton} href="/">
                        Zur Startseite
                    </Link>
                    <Link className={styles.secondaryLink} href="/artikel">
                        Zu den Artikeln
                    </Link>
                    <Link className={styles.secondaryLink} href="/podcasts">
                        Zu den Podcasts
                    </Link>
                </div>
            </section>
        </main>
    );
}
