'use cache';

import {type Metadata} from 'next';
import {getAbout} from '@/src/lib/strapi';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {absoluteRoute} from '@/src/lib/routes';
import {ContentImage} from '@/src/components/ContentImage';
import {Section} from '@/src/components/Section';
import {ContentLayout} from '@/app/ContentLayout';
import {ContentWithToc} from '@/src/components/ContentWithToc';
import placeholderCover from '@/public/images/m10z.jpg';

const REVALIDATE_SECONDS = 3600;

function extractDescription(content: string): string {
    // Remove markdown headers, links, and formatting
    const plainText = content
        .replace(/^#+\s+/gm, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\*\*([^\*]+)\*\*/g, '$1')
        .replace(/\*([^\*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();
    
    // Extract first paragraph (up to 160 chars)
    const firstParagraph = plainText.split('\n\n')[0] || plainText;
    const truncated = firstParagraph.length > 160 
        ? firstParagraph.substring(0, 157) + '...'
        : firstParagraph;
    
    return truncated || 'Von und mit Mindestens 10 Zeichen. Wer wir sind und was wir machen.';
}

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
                <ContentWithToc markdown={about.content} />
            </article>
        </main>
    );
}
