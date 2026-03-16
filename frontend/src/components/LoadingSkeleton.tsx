import styles from './LoadingSkeleton.module.css';
import contentCardStyles from './ContentCard.module.css';

type LoadingSkeletonProps = {
    /** Number of card skeletons to show in the grid (default: 6) */
    cards?: number;
    /** Whether to show a title bar placeholder (default: true) */
    showTitle?: boolean;
};

/**
 * Grid-based skeleton loading state for list pages (articles, podcasts, categories, etc.).
 * Renders placeholder cards with pulsing animation.
 */
export function LoadingSkeletonGrid({cards = 6, showTitle = true}: LoadingSkeletonProps) {
    return (
        <section data-list-page>
            <div className={styles.container}>
                {showTitle ? <div className={styles.titleBar} /> : null}
                <div className={styles.grid}>
                    {Array.from({length: cards}, (_, i) => (
                        <article key={i} className={contentCardStyles.card}>
                            <div className={styles.cardMedia} />
                            <div className={styles.cardBody}>
                                <div className={styles.meta}>
                                    <div className={styles.pill} />
                                    <div className={styles.pill} />
                                </div>
                                <div className={styles.bar} />
                                <div className={styles.barShort} />
                                <div className={styles.barXShort} />
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

/**
 * Detail page skeleton for single article/podcast views.
 * Renders a hero image placeholder, title bar, and content lines.
 */
export function LoadingSkeletonDetail() {
    return (
        <div className={styles.container}>
            <div className={styles.detailImage} />
            <div className={styles.meta}>
                <div className={styles.pill} />
                <div className={styles.pill} />
                <div className={styles.pill} />
            </div>
            <div className={styles.detailTitle} />
            <div className={styles.detailBody}>
                <div className={styles.detailLine} />
                <div className={styles.detailLine} />
                <div className={styles.detailLine} style={{width: '85%'}} />
                <div className={styles.detailLine} style={{width: '70%'}} />
                <div className={styles.detailLine} />
                <div className={styles.detailLine} style={{width: '60%'}} />
            </div>
        </div>
    );
}
