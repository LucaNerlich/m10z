'use cache';

import {type Metadata} from 'next';
import {getAbout} from '@/src/lib/strapi';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {absoluteRoute} from '@/src/lib/routes';
import {ContentImage} from '@/src/components/ContentImage';
import {Section} from '@/src/components/Section';
import {ContentLayout} from '@/app/ContentLayout';
import {Markdown} from '@/src/lib/markdown/Markdown';
import placeholderCover from '@/public/images/m10z.jpg';

const REVALIDATE_SECONDS = 3600;

/**
 * Produce a short plain-text description from Markdown content.
 *
 * Strips headings, inline links, emphasis, and inline code, then returns the first paragraph
 * with a maximum length of 160 characters. If the resulting description is empty, returns a fixed fallback string.
 *
 * @param content - Markdown-formatted content to extract the description from
 * @returns A plaintext description: the first paragraph of `content` with markdown removed, truncated to 160 characters, or the fallback string `Von und mit Mindestens 10 Zeichen. Wer wir sind und was wir machen.` if empty
 */
function extractDescription(content: string): string {
    // Remove markdown headers, links, and formatting
    const plainText = content
        .replace(/^#+\s+/gm, '')
        .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();

    // Extract first paragraph (up to 160 chars)
    const firstParagraph = plainText.split('\n\n')[0] || plainText;
    const truncated = firstParagraph.length > 160
        ? firstParagraph.substring(0, 157) + '...'
        : firstParagraph;

    return truncated || 'Von und mit Mindestens 10 Zeichen. Wer wir sind und was wir machen.';
}

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
        revalidateSeconds: REVALIDATE_SECONDS,
        tags: ['about', 'strapi:about'],
    });

    const title = about.name;
    const description = extractDescription(about.content);

    return {
        title,
        description,
        robots: {
            index: true,
            follow: true,
        },
        alternates: {
            canonical: absoluteRoute('/ueber-uns'),
        },
    };
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
        revalidateSeconds: REVALIDATE_SECONDS,
        tags: ['about', 'strapi:about'],
    });

    const logoMedia = about.logo ? normalizeStrapiMedia(about.logo) : null;
    const optimizedMedia = logoMedia ? getOptimalMediaFormat(logoMedia, 'large') : undefined;

    // Fallback configuration
    const fallbackSrc = placeholderCover;
    const fallbackWidth = 400;
    const fallbackHeight = 225;

    // Determine final values
    const mediaUrl = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : undefined;
    const imageSrc = mediaUrl ?? fallbackSrc;
    const imageWidth = optimizedMedia?.width ?? fallbackWidth;
    const imageHeight = optimizedMedia?.height ?? fallbackHeight;
    const placeholder = mediaUrl ? 'empty' : 'blur';

    return (
        <main>
            <article>
                <ContentLayout>
                    <ContentImage
                        src={imageSrc}
                        alt={about.name}
                        width={imageWidth}
                        height={imageHeight}
                        placeholder={placeholder}
                    />
                    <Section>
                        <h1>{about.name}</h1>
                        {about.alternateName ? (
                            <p>{about.alternateName}</p>
                        ) : null}
                    </Section>
                </ContentLayout>
                <ContentLayout>
                    <Markdown markdown={about.content} />
                </ContentLayout>
            </article>
        </main>
    );
}