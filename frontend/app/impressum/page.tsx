;

import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {getImprint} from '@/src/lib/strapi';
import {absoluteRoute} from '@/src/lib/routes';

const REVALIDATE_SECONDS = 3600;

export const metadata: Metadata = {
    title: 'Impressum',
    description: 'Impressum von Mindestens 10 Zeichen. Angaben gemäß § 5 TMG über den Anbieter dieser Website.',
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: absoluteRoute('/impressum'),
    },
};

export default async function ImprintPage() {
    const imprint = await getImprint({
        revalidateSeconds: REVALIDATE_SECONDS,
        tags: ['legal', 'imprint'],
    });

    return (
        <main>
            <h1>{imprint.title}</h1>
            <Markdown markdown={imprint.content} />
        </main>
    );
}
