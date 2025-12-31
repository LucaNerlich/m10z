import {ContentGrid} from './ContentGrid';
import {Card} from './Card';
import cardStyles from './ContentCard.module.css';
import styles from './SkeletonList.module.css';

/**
 * Render a skeleton UI for the Podcasts list showing placeholder cards while content loads.
 *
 * @returns A React element containing a section titled "Podcasts" with a grid of 12 placeholder cards (media, meta, title, and description skeletons).
 */
export function PodcastListSkeleton() {
    return (
        <section data-list-page>
            <h1>Podcasts</h1>
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
