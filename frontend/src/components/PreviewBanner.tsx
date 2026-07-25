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
        <div className={styles.banner} role="status">
            {message}
        </div>
    );
}
