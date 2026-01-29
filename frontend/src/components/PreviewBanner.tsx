'use client';

import styles from './PreviewBanner.module.css';

export default function PreviewBanner() {
    return (
        <div className={styles.banner} role="status" aria-live="polite">
            Preview Mode - This content is not published.
        </div>
    );
}
