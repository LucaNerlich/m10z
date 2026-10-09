import {type UmamiTrafficStats} from '@/src/lib/analytics/umamiStats';
import {routes} from '@/src/lib/routes';
import {formatInteger} from '@/src/lib/statistik/statistikFormat';

import {StatistikBarList, type StatistikBarListItem} from './StatistikBarList';
import {StatistikColumns} from './StatistikDashboard';
import {StatistikPanel} from './StatistikPanel';
import {StatistikStatsBar, type StatistikStat} from './StatistikStatsBar';

type StatistikContentTrafficProps = {
    traffic: UmamiTrafficStats;
};

/**
 * Article pageviews and podcast-download events, below the site-wide reach panel.
 */
export function StatistikContentTraffic({traffic}: StatistikContentTrafficProps) {
    const {articles, podcasts} = traffic.content;

    const articleStats: StatistikStat[] = [
        {key: 'pageviews', label: 'Seitenaufrufe', value: formatInteger(articles.pageviews), tone: 'primary'},
        {key: 'visitors', label: 'Besucher', value: formatInteger(articles.visitors), tone: 'primary'},
        {key: 'visits', label: 'Besuche', value: formatInteger(articles.visits), tone: 'primary'},
    ];

    const podcastStats: StatistikStat[] = [
        {key: 'downloads', label: 'Downloads', value: formatInteger(podcasts.downloads), tone: 'secondary'},
    ];

    const topEpisodes: StatistikBarListItem[] = podcasts.topEpisodes.map((episode) => ({
        key: episode.slug,
        label: episode.slug,
        href: routes.podcast(episode.slug),
        value: episode.downloads,
        title: `${episode.slug}: ${formatInteger(episode.downloads)} Downloads`,
    }));

    return (
        <StatistikColumns>
            <StatistikPanel
                title='Artikel'
                description='Seitenaufrufe auf Artikelseiten in den letzten 30 Tagen.'>
                <StatistikStatsBar stats={articleStats} />
            </StatistikPanel>
            <StatistikPanel
                title='Podcasts'
                description='Downloads über das Umami-Event „podcast-download“ in den letzten 30 Tagen.'>
                <StatistikStatsBar stats={podcastStats} />
                {topEpisodes.length > 0 ? <StatistikBarList items={topEpisodes} tone='secondary' /> : null}
            </StatistikPanel>
        </StatistikColumns>
    );
}
