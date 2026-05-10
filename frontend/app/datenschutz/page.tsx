import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {getPrivacy} from '@/src/lib/strapi';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Datenschutz',
    description:
        'Datenschutzerklärung von Mindestens 10 Zeichen. Informationen zur Erhebung, Verarbeitung und Nutzung Ihrer personenbezogenen Daten.',
    path: '/datenschutz',
    ogImageAlt: 'Datenschutzerklärung von Mindestens 10 Zeichen',
});

export default async function PrivacyPage() {
    const privacy = await getPrivacy({
        tags: ['legal', 'privacy'],
    });

    return (
        <div data-list-page>
            <h1>{privacy.title}</h1>
            <Markdown markdown={privacy.content} />
        </div>
    );
}
