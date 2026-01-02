import styles from './ImageWarning.module.css';
import {umamiExternalLinkEvent} from '@/src/lib/analytics/umami';

type ImageWarningProps = {
    src: string;
    alt?: string;
};

/**
 * Validates that a URL uses a safe protocol (http: or https:).
 * Prevents XSS attacks via javascript: URLs or other dangerous protocols.
 *
 * @param url - The URL to validate
 * @returns true if the URL uses a safe protocol, false otherwise
 */
function isSafeUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        // Invalid URL format - treat as unsafe
        return false;
    }
}

/**
 * Warning component displayed when an external image cannot be loaded
 * due to security restrictions (hostname not configured in next.config.js).
 */
export function ImageWarning({src, alt}: ImageWarningProps) {
    const isSafe = isSafeUrl(src);

    return (
        <div className={styles.container}>
            <div className={styles.warning}>
                <span className={styles.icon}>⚠️</span>
                <div className={styles.content}>
                    <p className={styles.message}>
                        Bild konnte nicht geladen werden: Die Domain ist nicht autorisiert.
                    </p>
                    {alt && (
                        <p className={styles.altText}>
                            Alt-Text: {alt}
                        </p>
                    )}
                    <p className={styles.url}>
                        {isSafe ? (
                            <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.link}
                                data-umami-event={umamiExternalLinkEvent(src, 'image-warning')}
                            >
                                {src}
                            </a>
                        ) : (
                            <span className={styles.link}>{src}</span>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}

