import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {getImprint} from '@/src/lib/strapi';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Impressum',
    description: 'Impressum von Mindestens 10 Zeichen. Angaben gemäß § 5 TMG über den Anbieter dieser Website.',
    path: '/impressum',
    ogImageAlt: 'Impressum von Mindestens 10 Zeichen',
});

export default async function ImprintPage() {
    const imprint = await getImprint({
        tags: ['legal', 'imprint'],
    });

    return (
        <div data-list-page>
            <h1>{imprint.title}</h1>
            <Markdown markdown={imprint.content} />
        </div>
    );
}
