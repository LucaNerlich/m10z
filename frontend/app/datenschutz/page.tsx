import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {getPrivacy} from '@/src/lib/strapi';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

export const metadata: Metadata = {
    title: 'Datenschutz',
    description: 'Datenschutzerklärung von Mindestens 10 Zeichen. Informationen zur Erhebung, Verarbeitung und Nutzung Ihrer personenbezogenen Daten.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/datenschutz'),
    },
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
        tags: ['legal', 'privacy'],
    });

    return (
        <main data-list-page>
            <h1>{privacy.title}</h1>
            <Markdown markdown={privacy.content} />
        </main>
    );
}
