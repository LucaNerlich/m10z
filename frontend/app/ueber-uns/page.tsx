'use cache';

import {type Metadata} from 'next';
import {absoluteRoute} from '@/src/lib/routes';

const REVALIDATE_SECONDS = 3600;

export const metadata: Metadata = {
    title: 'Über Uns',
    description: 'Von und mit Mindestens 10 Zeichen. Wer wir sind und was wir machen.',
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: absoluteRoute('/ueber-uns'),
    },
};

export default async function AboutUsPage() {

    return (
        <main>
        </main>
    );
}
