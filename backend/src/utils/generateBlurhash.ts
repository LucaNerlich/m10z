import sharp from 'sharp';
import {encode, decode} from 'blurhash';

/**
 * Generate a base64 data URL from an image buffer for use as Next.js Image blur placeholder.
 * Creates a small blurred version of the image and converts it to a base64 data URL.
 *
 * @param fileBuffer - The image file buffer
 * @param width - Width of the blur placeholder (default: 10, Next.js recommendation)
 * @param height - Height of the blur placeholder (default: 10, Next.js recommendation)
 * @returns The base64 data URL string (e.g., "data:image/png;base64,..."), or null if generation fails
 */
export async function generateBlurDataUrl(fileBuffer: Buffer, width: number = 10, height: number = 10): Promise<string | null> {
    try {
        // Resize image to small size for blur placeholder (Next.js recommends 10x10)
        const resizedBuffer = await sharp(fileBuffer)
            .resize(width, height, {
                fit: 'cover',
            })
            .png()
            .toBuffer();

        // Convert to base64 data URL
        const base64 = resizedBuffer.toString('base64');
        return `data:image/png;base64,${base64}`;
    } catch (error) {
        // Log error but return null to avoid blocking uploads
        console.error('Error generating blur data URL:', error);
        return null;
    }
}

/**
 * Generate a blurhash string from an image buffer (kept for backwards compatibility).
 * Resizes the image to 32x32, extracts RGBA pixel data, and encodes with blurhash.
 *
 * @param fileBuffer - The image file buffer
 * @returns The blurhash string, or null if generation fails
 */
export async function generateBlurhash(fileBuffer: Buffer): Promise<string | null> {
    try {
        // Resize image to 32x32 for performance and extract RGBA pixel data
        const {data, info} = await sharp(fileBuffer)
            .resize(32, 32, {
                fit: 'cover',
            })
            .ensureAlpha()
            .raw()
            .toBuffer({resolveWithObject: true});

        // Encode with blurhash using 4x3 components (good balance of quality and size)
        const blurhash = encode(
            new Uint8ClampedArray(data),
            info.width,
            info.height,
            4,
            3,
        );

        return blurhash;
    } catch (error) {
        // Log error but return null to avoid blocking uploads
        console.error('Error generating blurhash:', error);
        return null;
    }
}

