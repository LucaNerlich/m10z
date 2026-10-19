import styles from './ImageWarning.module.css';
import {umamiExternalLinkEvent} from '@/src/lib/analytics/umami';

type ImageWarningProps = {
    src: string;
    alt?: string;
    /** Why the image could not be shown; defaults to the hostname gate. */
    reason?: 'unauthorized' | 'load-error';
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
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        // Invalid URL format - treat as unsafe
        return false;
    }
}

/**
 * Warning shown instead of an image when its host is not in the image allowlist
 * or when the image fails to load; `reason` selects the message.
 */
export function ImageWarning({src, alt, reason = 'unauthorized'}: ImageWarningProps) {
    const isSafe = isSafeUrl(src);
    const message = reason === 'load-error'
        ? 'Bild konnte nicht geladen werden. Die Datei ist möglicherweise nicht mehr verfügbar.'
        : 'Bild konnte nicht geladen werden: Die Domain ist nicht autorisiert.';

    return (
        <div className={styles.container}>
            <div className={styles.warning}>
                <span className={styles.icon}>⚠️</span>
                <div className={styles.content}>
                    <p className={styles.message}>
                        {message}
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

