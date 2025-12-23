'use cache';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {getPrivacy} from '@/src/lib/strapi';

const REVALIDATE_SECONDS = 3600;

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
