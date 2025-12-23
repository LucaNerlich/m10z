'use cache';

import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {getPrivacy} from '@/src/lib/strapi';
import {absoluteRoute} from '@/src/lib/routes';

const REVALIDATE_SECONDS = 3600;

export const metadata: Metadata = {
    title: 'Datenschutz',
    description: 'Datenschutzerklärung von Mindestens 10 Zeichen. Informationen zur Erhebung, Verarbeitung und Nutzung Ihrer personenbezogenen Daten.',
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: absoluteRoute('/datenschutz'),
    },
};

export default async function PrivacyPage() {
    const privacy = await getPrivacy({
        revalidateSeconds: REVALIDATE_SECONDS,
        tags: ['legal', 'privacy'],
    });

    return (
        <main>
            <h1>{privacy.title}</h1>
            <Markdown markdown={privacy.content} />
        </main>
    );
}
