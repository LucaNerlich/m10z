'use cache';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {getImprint} from '@/src/lib/strapi';

const REVALIDATE_SECONDS = 3600;

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
