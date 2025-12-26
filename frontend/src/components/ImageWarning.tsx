import styles from './ImageWarning.module.css';

type ImageWarningProps = {
    src: string;
    alt?: string;
};

/**
 * Warning component displayed when an external image cannot be loaded
 * due to security restrictions (hostname not configured in next.config.js).
 */
export function ImageWarning({src, alt}: ImageWarningProps) {
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
                        <a href={src} target="_blank" rel="noopener noreferrer" className={styles.link}>
                            {src}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

