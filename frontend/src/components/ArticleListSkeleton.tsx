import {ContentGrid} from './ContentGrid';
import {Card} from './Card';
import cardStyles from './ContentCard.module.css';
import styles from './SkeletonList.module.css';

/**
 * Render a skeleton grid of article cards used as a loading placeholder.
 *
 * @returns A JSX element containing a section with an "Artikel" heading and a ContentGrid of 12 skeleton article cards.
 */
export function ArticleListSkeleton() {
    return (
        <section data-list-page>
            <h1>Artikel</h1>
            <ContentGrid gap="comfortable">
                {Array.from({length: 12}).map((_, index) => (
                    <Card key={index}>
                        <div className={cardStyles.loadingMedia} />
                        <div className={styles.cardBody}>
                            <div className={styles.metaRow}>
                                <div className={cardStyles.loadingPill} />
                                <div className={`${cardStyles.loadingBar} ${cardStyles.xshort}`} />
                            </div>
                            <div className={`${cardStyles.loadingBar} ${styles.titleBar}`} />
                            <div className={`${cardStyles.loadingBar} ${styles.descriptionBar}`} />
                        </div>
                    </Card>
                ))}
            </ContentGrid>
        </section>
    );
}
