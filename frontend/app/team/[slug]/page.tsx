import Image from 'next/image';
import {notFound} from 'next/navigation';

import {fetchAuthorBySlug} from '@/src/lib/strapiContent';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';

type PageProps = {
    params: Promise<{slug: string}>;
};

export default async function AuthorPage({params}: PageProps) {
    const {slug} = await params;
    const author = await fetchAuthorBySlug(slug);
    if (!author) return notFound();

    const avatar = normalizeStrapiMedia(author.avatar);
    const avatarUrl = mediaUrlToAbsolute({media: avatar, strapiUrl: process.env.NEXT_PUBLIC_STRAPI_URL});

    return (
        <main>
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
