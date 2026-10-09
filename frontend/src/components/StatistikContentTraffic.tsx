import {type UmamiTrafficStats} from '@/src/lib/analytics/umamiStats';
import {routes} from '@/src/lib/routes';
import {formatInteger} from '@/src/lib/statistik/statistikFormat';

import {StatistikBarList, type StatistikBarListItem} from './StatistikBarList';
import {StatistikColumns} from './StatistikDashboard';
import {StatistikPanel} from './StatistikPanel';

type StatistikContentTrafficProps = {
    traffic: UmamiTrafficStats;
};

/**
 * Per-article pageviews and per-podcast downloads, below the site-wide reach panel.
 */
export function StatistikContentTraffic({traffic}: StatistikContentTrafficProps) {
    const {articles, podcasts} = traffic.content;

    const topArticles: StatistikBarListItem[] = articles.topArticles.map((article) => ({
        key: article.slug,
        label: article.slug,
        href: routes.article(article.slug),
        value: article.pageviews,
        title: `${article.slug}: ${formatInteger(article.pageviews)} Seitenaufrufe`,
    }));

    const topEpisodes: StatistikBarListItem[] = podcasts.topEpisodes.map((episode) => ({
        key: episode.slug,
        label: episode.slug,
        href: routes.podcast(episode.slug),
        value: episode.downloads,
        title: `${episode.slug}: ${formatInteger(episode.downloads)} Downloads`,
    }));

    if (topArticles.length === 0 && topEpisodes.length === 0) {
        return null;
    }

    return (
        <StatistikColumns>
            {topArticles.length > 0 ? (
                <StatistikPanel title='Artikel' description='Seitenaufrufe pro Artikel'>
                    <StatistikBarList items={topArticles} tone='primary' />
                </StatistikPanel>
            ) : null}
            {topEpisodes.length > 0 ? (
                <StatistikPanel title='Podcasts' description='Downloads pro Podcast'>
                    <StatistikBarList items={topEpisodes} tone='secondary' />
                </StatistikPanel>
            ) : null}
        </StatistikColumns>
    );
}
