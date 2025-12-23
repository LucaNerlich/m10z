'use cache';

import Image from 'next/image';
import {notFound} from 'next/navigation';

import {fetchAuthorBySlug} from '@/src/lib/strapiContent';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Render the author page for the given route slug.
 *
 * Validates the slug and, if a matching author exists, resolves the author's avatar URL and renders the author's profile including title, optional description, and optional lists of articles and podcasts. If the slug is invalid or no author is found, the function triggers Next.js's notFound response.
 *
 * @param params - A promise resolving to route parameters containing the `slug` string.
 * @returns The page's JSX element containing the author's profile and any associated articles or podcasts.
 */
export default async function AuthorPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const author = await fetchAuthorBySlug(slug);
    if (!author) return notFound();

    const avatar = normalizeStrapiMedia(author.avatar);
    const avatarUrl = mediaUrlToAbsolute({media: avatar});

    return (
        <main>
            <h2>TODO</h2>
            {avatarUrl ? <Image src={avatarUrl} alt={author.title ?? 'Avatar'} width={96} height={96} /> : null}
            <h1>{author.title}</h1>
            {author.description ? <p>{author.description}</p> : null}

            {author.articles && author.articles.length > 0 ? (
                <section>
                    <h2>Artikel</h2>
                    <ul>
                        {author.articles.map((a) => (
                            <li key={a.slug}>
                                <a href={`/artikel/${a.slug}`}>{a.base.title}</a>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {author.podcasts && author.podcasts.length > 0 ? (
                <section>
                    <h2>Podcasts</h2>
                    <ul>
                        {author.podcasts.map((p) => (
                            <li key={p.slug}>
                                <a href={`/podcasts/${p.slug}`}>{p.base.title}</a>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </main>
    );
}