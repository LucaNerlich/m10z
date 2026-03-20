import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';

export const alt = 'Podcast-Vorschaubild';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

/**
 * Generate a branded Open Graph image for a podcast episode page.
 *
 * Displays the episode title on a gradient background with M10Z branding.
 * Falls back to a generic branded card if the episode cannot be fetched.
 */
export default async function Image({params}: {params: Promise<{slug: string}>}) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);

    const poppinsBold = await readFile(join(process.cwd(), 'public/fonts/Poppins-Bold.woff2'));

    let title = 'Mindestens 10 Zeichen';
    let description: string | undefined;

    if (slug) {
        try {
            const episode = await fetchPodcastBySlug(slug);
            if (episode) {
                title = episode.title;
                description = episode.description ?? undefined;
            }
        } catch {
            // Fall back to default title
        }
    }

    // Truncate long titles and descriptions
    const displayTitle = title.length > 80 ? title.slice(0, 77) + '...' : title;
    const displayDescription = description
        ? description.length > 120
            ? description.slice(0, 117) + '...'
            : description
        : undefined;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '60px',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    fontFamily: 'Poppins',
                    color: '#ffffff',
                }}>
                {/* Accent bar */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '6px',
                        background: '#ff6b35',
                    }}
                />

                {/* Site branding */}
                <div
                    style={{
                        position: 'absolute',
                        top: '40px',
                        left: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#ff6b35',
                            letterSpacing: '0.02em',
                        }}>
                        m10z.de
                    </div>
                    <div
                        style={{
                            fontSize: '18px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            marginLeft: '8px',
                        }}>
                        Podcast
                    </div>
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: displayTitle.length > 50 ? '36px' : '48px',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        marginBottom: displayDescription ? '16px' : '0',
                    }}>
                    {displayTitle}
                </div>

                {/* Description */}
                {displayDescription ? (
                    <div
                        style={{
                            fontSize: '22px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            lineHeight: 1.4,
                        }}>
                        {displayDescription}
                    </div>
                ) : null}
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'Poppins',
                    data: poppinsBold,
                    style: 'normal',
                    weight: 700,
                },
            ],
        },
    );
}
