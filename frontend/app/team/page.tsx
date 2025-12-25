'use cache';

import Image from 'next/image';

import {fetchAuthorsList} from '@/src/lib/strapiContent';
import {mediaUrlToAbsolute, getOptimalMediaFormat} from '@/src/lib/rss/media';
import Link from 'next/link';

/**
 * Renders the Team page by fetching authors and displaying each as a list item with an optional avatar, title, and description.
 *
 * @returns The JSX element for the Team page containing a list of authors; each author links to their team page.
 */
export default async function TeamPage() {
    const authors = await fetchAuthorsList();

    return (
        <section>
            <h1>Team</h1>
            <h2>TODO</h2>
            <ul>
                {authors.map((author) => {
                    const avatar = getOptimalMediaFormat(author.avatar, 'thumbnail');
                    const avatarUrl = mediaUrlToAbsolute({media: avatar});
                    const avatarWidth = avatar.width ?? 64;
                    const avatarHeight = avatar.height ?? 64;
                    return (
                        <li key={author.slug ?? author.id}>
                            <Link href={`/team/${author.slug ?? ''}`}>
                                {avatarUrl ? (
                                    <Image src={avatarUrl} alt={author.title ?? 'Avatar'} width={avatarWidth} height={avatarHeight} />
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