import {type Metadata} from 'next';
import {getAbout} from '@/src/lib/strapi/singleTypes';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/strapi/media';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {deriveExcerpt} from '@/src/lib/metadata/excerpt';
import {ContentImage} from '@/src/components/ContentImage';

import {Markdown} from '@/src/lib/markdown/Markdown';
import placeholderCover from '@/public/images/m10z.jpg';

const ABOUT_DESCRIPTION_FALLBACK = 'Von und mit Mindestens 10 Zeichen. Wer wir sind und was wir machen.';

/**
 * Produce metadata for the About page based on CMS content.
 *
 * Uses the fetched "about" record to set the page title and a short description,
 * and provides robots directives and a canonical alternate URL.
 *
 * @returns A Metadata object containing `title`, `description`, `robots` (index/follow), and `alternates.canonical`
 */
export async function generateMetadata(): Promise<Metadata> {
    const about = await getAbout({
        tags: ['about', 'strapi:about'],
    });

    const title = about.name;
    const description = deriveExcerpt(about.content, 160) ?? ABOUT_DESCRIPTION_FALLBACK;

    return buildStaticListMetadata({
        title,
        description,
        path: '/ueber-uns',
        ogImageAlt: 'Über Mindestens 10 Zeichen',
    });
}

/**
 * Render the About Us page including an optimized logo image, page title, optional alternate name, and the content body.
 *
 * The component obtains the about data, chooses an optimized logo image when available (falling back to a placeholder), and renders the main page layout with the image, heading, optional alternate name, and the markdown content with a table of contents.
 *
 * @returns The JSX element representing the About Us page
 */
export default async function AboutUsPage() {
    const about = await getAbout({
        tags: ['about', 'strapi:about'],
    });

    const logoMedia = about.logo ? normalizeStrapiMedia(about.logo) : null;
    const optimizedMedia = logoMedia ? getOptimalMediaFormat(logoMedia, 'large') : undefined;

    const fallbackSrc = placeholderCover;
    const fallbackWidth = 400;
    const fallbackHeight = 225;

    const mediaUrl = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : undefined;
    const imageSrc = mediaUrl ?? fallbackSrc;
    const imageWidth = optimizedMedia?.width ?? fallbackWidth;
    const imageHeight = optimizedMedia?.height ?? fallbackHeight;
    const placeholder = mediaUrl ? 'empty' : 'blur';

    return (
        <div data-list-page>
            <article>
                <ContentImage
                    src={imageSrc}
                    alt={about.name}
                    width={imageWidth}
                    height={imageHeight}
                    placeholder={placeholder}
                    priority={true}
                    sizes="(max-width: 700px) 100vw, 700px"
                />
                <section>
                    <h1>{about.name}</h1>
                    {about.alternateName ? (
                        <p>{about.alternateName}</p>
                    ) : null}
                </section>

                <Markdown markdown={about.content} />
            </article>
        </div>
    );
}
