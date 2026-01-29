'use client';

import styles from './PreviewBanner.module.css';

type PreviewBannerProps = {
    status?: 'draft' | 'published';
};

export default function PreviewBanner({status = 'draft'}: PreviewBannerProps) {
    const message =
        status === 'published'
            ? 'Preview Mode - This content is published.'
            : 'Preview Mode - This content is not published.';

    return (
        <output className={styles.banner}>
            {message}
        </output>
    );
}
