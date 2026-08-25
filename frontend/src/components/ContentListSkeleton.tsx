import {ContentGrid} from './ContentGrid';
import {Card} from './Card';
import cardStyles from './ContentCard.module.css';
import styles from './SkeletonList.module.css';

type ContentListSkeletonProps = {
    /** Heading shown above the skeleton grid (e.g. "Artikel", "Podcasts"). */
    title: string;
};

/**
 * Skeleton UI for paginated content list pages: a titled grid of placeholder
 * cards (media, meta, title, and description skeletons) shown while content loads.
 */
export function ContentListSkeleton({title}: ContentListSkeletonProps) {
    return (
        <section data-list-page>
            <h1>{title}</h1>
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
