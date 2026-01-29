'use client';

import styles from './PreviewBanner.module.css';

export default function PreviewBanner() {
    return (
        <output className={styles.banner}>
            Preview Mode - This content is not published.
        </output>
    );
}
