import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {type StrapiPodcast} from '@/src/lib/rss/audiofeed';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {PodcastCard} from '@/src/components/PodcastCard';

import styles from './RelatedContent.module.css';

type RelatedContentProps = {
    articles?: StrapiArticle[];
    podcasts?: StrapiPodcast[];
    maxItems?: number;
};

/**
 * Renders a "related content" section with article and/or podcast cards.
 * Shows nothing if there are no related items.
 */
export function RelatedContent({articles = [], podcasts = [], maxItems = 3}: RelatedContentProps) {
    const hasArticles = articles.length > 0;
    const hasPodcasts = podcasts.length > 0;

    if (!hasArticles && !hasPodcasts) return null;

    // Interleave articles and podcasts, taking up to maxItems total
    const items: Array<{type: 'article'; data: StrapiArticle} | {type: 'podcast'; data: StrapiPodcast}> = [];
    const maxA = Math.min(articles.length, maxItems);
    const maxP = Math.min(podcasts.length, maxItems);
    let ai = 0;
    let pi = 0;

    while (items.length < maxItems && (ai < maxA || pi < maxP)) {
        if (ai < maxA) {
            items.push({type: 'article', data: articles[ai]!});
            ai++;
        }
        if (items.length < maxItems && pi < maxP) {
            items.push({type: 'podcast', data: podcasts[pi]!});
            pi++;
        }
    }

    if (items.length === 0) return null;

    return (
        <section className={styles.section}>
            <h2 className={styles.heading}>Mehr zu diesem Thema</h2>
            <ContentGrid gap="comfortable">
                {items.map((item) =>
                    item.type === 'article' ? (
                        <ArticleCard key={`a-${item.data.slug}`} article={item.data} />
                    ) : (
                        <PodcastCard key={`p-${item.data.slug}`} podcast={item.data} />
                    )
                )}
            </ContentGrid>
        </section>
    );
}
