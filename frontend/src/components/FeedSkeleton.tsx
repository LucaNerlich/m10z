import {Card} from './Card';
import cardStyles from './ContentCard.module.css';
import styles from './FeedSkeleton.module.css';

export function FeedSkeleton() {
    return (
        <div className={styles.page}>
            <aside className={styles.toc} aria-label="Inhaltsverzeichnis">
                <h1 className={styles.tocTitle}>Inhaltsverzeichnis</h1>
                <ul className={styles.tocList}>
                    {Array.from({length: 10}).map((_, index) => (
                        <li key={index} className={styles.tocEntry}>
                            <div className={styles.tocLink}>
                                <div className={styles.tocMetadata}>
                                    <div className={`${cardStyles.loadingPill} ${styles.tocTagPlaceholder}`} />
                                    <div className={`${cardStyles.loadingBar} ${cardStyles.xshort} ${styles.tocDatePlaceholder}`} />
                                </div>
                                <div className={`${cardStyles.loadingBar} ${styles.tocLabelPlaceholder}`} />
                            </div>
                        </li>
                    ))}
                </ul>
            </aside>

            <section className={styles.feed} aria-label="Neueste Inhalte">
                {Array.from({length: 10}).map((_, index) => (
                    <Card key={index}>
                        <div className={styles.media}>
                            <div className={`${cardStyles.loadingMedia} ${styles.cover}`} />
                            <div className={`${cardStyles.loadingMedia} ${styles.banner}`} />
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.metaRow}>
                                <div className={cardStyles.loadingPill} />
                                <div className={`${cardStyles.loadingBar} ${cardStyles.xshort}`} />
                            </div>
                            <div className={`${cardStyles.loadingBar} ${styles.titleBar}`} />
                            <div className={`${cardStyles.loadingBar} ${styles.descriptionBar}`} />
                            <div className={`${cardStyles.loadingBar} ${cardStyles.short} ${styles.actionBar}`} />
                        </div>
                    </Card>
                ))}
            </section>
        </div>
    );
}

