import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {type ReactNode} from 'react';

/**
 * Shared building blocks for the branded Open Graph images (content pages,
 * M12G). Keeps the gradient frame, accent bar, and site branding in one place
 * so the per-route image files only describe their own content.
 */

export const OG_IMAGE_SIZE = {width: 1200, height: 630} as const;

const OG_BACKGROUND = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
const OG_ACCENT_COLOR = '#ff6b35';

let ogFontLoad: Promise<Buffer> | null = null;

/**
 * Load the Poppins Bold font used by the branded OG cards. The in-flight
 * promise is cached at module scope so concurrent and subsequent image
 * renders reuse the same read instead of re-reading the font file.
 */
export function loadOgFont(): Promise<Buffer> {
    ogFontLoad ??= readFile(join(process.cwd(), 'public/fonts/Poppins-Bold.woff2'));
    return ogFontLoad;
}

/** Truncate text to `limit` characters, ending with `ellipsis` (default "…"). */
export function truncateToLength(text: string, limit: number, ellipsis = '…'): string {
    if (text.length <= limit) return text;
    return text.slice(0, limit - ellipsis.length) + ellipsis;
}

type OgImageFrameProps = {
    /** Section label rendered next to the site name, e.g. "Artikel". */
    label: string;
    /** Font family for the card text; omitted when undefined (frame has no bundled font). */
    fontFamily?: string;
    children: ReactNode;
};

/**
 * The branded frame shared by all OG cards: gradient background, orange accent
 * bar, and the "m10z.de" branding header with a section label.
 */
export function OgImageFrame({label, fontFamily, children}: OgImageFrameProps) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '60px',
                background: OG_BACKGROUND,
                ...(fontFamily ? {fontFamily} : {}),
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
                    background: OG_ACCENT_COLOR,
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
                        color: OG_ACCENT_COLOR,
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
                    {label}
                </div>
            </div>

            {children}
        </div>
    );
}

/**
 * Build the standard content-page OG card: section label, title, and optional
 * description. Falls back to the site name when no title is given.
 */
export async function buildContentOgImageResponse(args: {
    label: string;
    title: string;
    description?: string;
}): Promise<ImageResponse> {
    const poppinsBold = await loadOgFont();

    const displayTitle = truncateToLength(args.title, 80, '...');
    const displayDescription = args.description
        ? truncateToLength(args.description, 120, '...')
        : undefined;

    return new ImageResponse(
        (
            <OgImageFrame
                label={args.label}
                fontFamily="Poppins"
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        flex: 1,
                    }}>
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
            </OgImageFrame>
        ),
        {
            ...OG_IMAGE_SIZE,
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
