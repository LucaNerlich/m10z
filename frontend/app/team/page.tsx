'use cache'

import Image from 'next/image';

import {fetchAuthorsList} from '@/src/lib/strapiContent';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import Link from 'next/link';

export default async function TeamPage() {
    const authors = await fetchAuthorsList();

    return (
        <section>
            <h1>Team</h1>
            <ul>
                {authors.map((author) => {
                    const avatar = normalizeStrapiMedia(author.avatar);
                    const preferredUrl = avatar.formats?.small?.url ?? avatar.url;
                    const avatarUrl = mediaUrlToAbsolute({
                        media: {...avatar, url: preferredUrl},
                        strapiUrl: process.env.NEXT_PUBLIC_STRAPI_URL,
                    });
                    return (
                        <li key={author.slug ?? author.id}>
                            <Link href={`/team/${author.slug ?? ''}`}>
                                {avatarUrl ? (
                                    <Image src={avatarUrl} alt={author.title ?? 'Avatar'} width={64} height={64} />
                                ) : null}
                                <p>{author.title}</p>
                            </Link>
                            {author.description ? <p>{author.description}</p> : null}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
