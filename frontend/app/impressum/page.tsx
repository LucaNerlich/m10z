import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {getImprint} from '@/src/lib/strapi';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

export const metadata: Metadata = {
    title: 'Impressum',
    description: 'Impressum von Mindestens 10 Zeichen. Angaben gemäß § 5 TMG über den Anbieter dieser Website.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/impressum'),
    },
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
        tags: ['legal', 'imprint'],
    });

    return (
        <main data-list-page>
            <h1>{imprint.title}</h1>
            <Markdown markdown={imprint.content} />
        </main>
    );
}
