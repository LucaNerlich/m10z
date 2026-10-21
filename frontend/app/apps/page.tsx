import Link from 'next/link';
import {type Metadata} from 'next';

import {Card} from '@/src/components/Card';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {routes} from '@/src/lib/routes';

import styles from './page.module.css';

const APPS_DESCRIPTION =
    'Kleine Werkzeuge und Spielereien rund um M10Z — Wichteln, Zufallsgeneratoren und mehr.';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Apps',
    description: APPS_DESCRIPTION,
    path: routes.apps,
    ogImageAlt: 'Apps bei M10Z',
});

const APPS = [
    {
        title: 'Wichteln',
        description:
            'Organisiere deine Wichtelrunde: Teilnehmer verwalten, zufällig zuordnen und Ergebnisse als Markdown exportieren.',
        href: routes.wichteln,
    },
] as const;

export default function AppsPage() {
    return (
        <div>
            <header className={styles.header}>
                <h1 className={styles.title}>Apps</h1>
                <p className={styles.subtitle}>
                    Kleine Werkzeuge und Spielereien rund um M10Z
                </p>
            </header>

            <div className={styles.grid}>
                {APPS.map((app) => (
                    <Link key={app.href} href={app.href} className={styles.cardLink}>
                        <Card>
                            <div className={styles.cardBody}>
                                <h2 className={styles.cardTitle}>{app.title}</h2>
                                <p className={styles.cardDescription}>{app.description}</p>
                                <span className={styles.cardAction}>Öffnen →</span>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
