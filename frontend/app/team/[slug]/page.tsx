'use cache';

import {type Metadata} from 'next';
import Image from 'next/image';
import {notFound} from 'next/navigation';

import {fetchAuthorBySlug} from '@/src/lib/strapiContent';
import {getOptimalMediaFormat, mediaUrlToAbsolute} from '@/src/lib/rss/media';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    'use cache';
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const author = await fetchAuthorBySlug(slug);
    if (!author) return {};

    const title = author.title || 'Autor';
    const description = author.description || undefined;
    const avatarMedia = getOptimalMediaFormat(author.avatar, 'thumbnail');
    const avatarImage = avatarMedia ? formatOpenGraphImage(avatarMedia) : undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/team/${slug}`),
        },
        openGraph: {
            type: 'profile',
            title,
            description,
            images: avatarImage,
        },
        twitter: {
            card: 'summary',
            title,
            description,
            images: avatarImage,
        },
    };
}

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

    const avatar = getOptimalMediaFormat(author.avatar, 'thumbnail');
    const avatarUrl = mediaUrlToAbsolute({media: avatar});
    const avatarWidth = avatar.width ?? 96;
    const avatarHeight = avatar.height ?? 96;

    return (
        <main>
            <h2>TODO</h2>
            {avatarUrl ? <Image src={avatarUrl} alt={author.title ?? 'Avatar'} width={avatarWidth}
                                height={avatarHeight} /> : null}
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
