import {CrownIcon, FireIcon, FlameIcon, ScalesIcon, TrophyIcon} from '@phosphor-icons/react/dist/ssr';
import {type Metadata} from 'next';
import Link from 'next/link';

import {getM12GArchive} from '@/src/lib/m12g/m12gArchive';
import {type M12GOverview, buildM12GOverview} from '@/src/lib/m12g/m12gStats';
import {formatMonthLong, formatMonthShort, formatVotes} from '@/src/lib/m12g/formatters';
import {type M12GLeaderboardEntry, type M12GStats, type M12GWinnerEntry} from '@/src/lib/m12g/types';
import {routes} from '@/src/lib/routes';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {formatInteger, pluralize} from '@/src/lib/statistik/statistikFormat';
import {ContentGrid} from '@/src/components/ContentGrid';
import {EmptyState} from '@/src/components/EmptyState';
import {M12GMonthCard} from '@/src/components/M12GMonthCard';
import {StatistikBarList, type StatistikBarListItem} from '@/src/components/StatistikBarList';
import {StatistikColumns, StatistikDashboard, StatistikIntro} from '@/src/components/StatistikDashboard';
import {StatistikPanel} from '@/src/components/StatistikPanel';
import {StatistikRecords, type StatistikRecordCard} from '@/src/components/StatistikRecords';
import {StatistikStatsBar, type StatistikStat} from '@/src/components/StatistikStatsBar';
import {StatistikTopList, type StatistikTopListItem} from '@/src/components/StatistikTopList';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'M12G Statistik',
    description: 'Monatliche Community-Abstimmungen zu M12G mit den jeweiligen Gewinnern.',
    path: routes.m12g,
    ogImageAlt: 'M12G Statistik – Mindestens 10 Zeichen',
});

function buildStats(stats: M12GStats): StatistikStat[] {
    return [
        {key: 'months', label: 'Monate', value: formatInteger(stats.totalMonths)},
        {key: 'games', label: 'Spiele', value: formatInteger(stats.totalUniqueGames), tone: 'secondary'},
        {key: 'votes', label: 'Stimmen', value: formatInteger(stats.totalVotes), tone: 'primary'},
        {key: 'avgVotes', label: 'Ø Stimmen pro Monat', value: formatInteger(stats.avgVotesPerMonth)},
    ];
}

function GameLink({slug, name}: {slug: string; name: string}) {
    return <Link href={routes.m12gGame(slug)}>{name}</Link>;
}

function buildRecordCards({records, streaks}: M12GOverview): StatistikRecordCard[] {
    const cards: StatistikRecordCard[] = [];

    if (records.busiestMonth) {
        cards.push({
            key: 'busiest',
            icon: <FireIcon weight='duotone' />,
            label: 'Meiste Stimmen',
            value: formatMonthLong(records.busiestMonth.month),
            detail: formatVotes(records.busiestMonth.totalVotes),
        });
    }
    if (records.closestRace) {
        const {month, margin, winnerCount} = records.closestRace;
        cards.push({
            key: 'closest',
            icon: <ScalesIcon weight='duotone' />,
            label: 'Knappstes Rennen',
            value: formatMonthLong(month),
            detail: margin === 0 ? `Gleichstand zwischen ${winnerCount} Spielen` : `${formatVotes(margin)} Vorsprung`,
        });
    }
    if (records.strongestWin) {
        cards.push({
            key: 'strongest',
            icon: <TrophyIcon weight='duotone' />,
            label: 'Deutlichster Sieg',
            value: <GameLink slug={records.strongestWin.slug} name={records.strongestWin.gameName} />,
            detail: `${formatVotes(records.strongestWin.votes)} im ${formatMonthLong(records.strongestWin.month)}`,
        });
    }
    if (records.mostWins) {
        cards.push({
            key: 'mostWins',
            icon: <CrownIcon weight='duotone' />,
            label: 'Rekordsieger',
            value: <GameLink slug={records.mostWins.slug} name={records.mostWins.name} />,
            detail: `${records.mostWins.wins}× gewonnen`,
        });
    }
    if (streaks.win) {
        cards.push({
            key: 'streak',
            icon: <FlameIcon weight='duotone' />,
            label: 'Längste Siegesserie',
            value: <GameLink slug={streaks.win.slug} name={streaks.win.name} />,
            detail: `${streaks.win.length} Monate in Folge`,
        });
    }

    return cards;
}

function toLeaderboardItems(entries: M12GLeaderboardEntry[]): StatistikTopListItem[] {
    return entries.map((entry) => ({
        key: entry.slug,
        title: entry.name,
        href: routes.m12gGame(entry.slug),
        externalHref: entry.link,
        externalLabel: `${entry.name} im Store ansehen (öffnet in neuem Fenster)`,
        meta: [
            entry.wins > 0 ? `${entry.wins}× gewonnen` : null,
            pluralize(entry.monthsNominated, 'Monat', 'Monate') + ' nominiert',
        ]
            .filter(Boolean)
            .join(' · '),
        value: formatVotes(entry.totalVotes),
    }));
}

function toHallOfFameItems(winners: M12GWinnerEntry[]): StatistikTopListItem[] {
    return [...winners].reverse().map((winner) => ({
        key: `${winner.month}-${winner.slug}`,
        title: winner.gameName,
        href: routes.m12gGame(winner.slug),
        meta: formatMonthLong(winner.month),
        value: formatVotes(winner.votes),
    }));
}

export default async function M12GPage() {
    const archive = await getM12GArchive();
    const overview = buildM12GOverview(archive);
    const {stats, monthsNewestFirst} = overview;

    if (monthsNewestFirst.length === 0) {
        return (
            <div data-list-page>
                <h1>Mindestens 12 Games</h1>
                <EmptyState message='Keine M12G-Abstimmungen gefunden.' />
            </div>
        );
    }

    const participationNewestFirst = [...stats.monthlyParticipation].reverse();
    const voteItems: StatistikBarListItem[] = participationNewestFirst.map((month) => ({
        key: month.month,
        label: formatMonthShort(month.month),
        value: month.totalVotes,
        title: `${formatMonthLong(month.month)}: ${formatVotes(month.totalVotes)}`,
    }));
    const gameCountItems: StatistikBarListItem[] = participationNewestFirst.map((month) => ({
        key: month.month,
        label: formatMonthShort(month.month),
        value: month.gameCount,
        title: `${formatMonthLong(month.month)}: ${pluralize(month.gameCount, 'Spiel', 'Spiele')}`,
    }));

    return (
        <div data-list-page>
            <StatistikIntro
                title='Mindestens 12 Games'
                lead={
                    <>
                        {pluralize(stats.totalMonths, 'Monat', 'Monate')} Community-Abstimmung,{' '}
                        {formatInteger(stats.totalUniqueGames)} nominierte Spiele und {formatVotes(stats.totalVotes)}{' '}
                        – M12G in Zahlen.
                    </>
                }
                meta={`Zuletzt abgestimmt: ${formatMonthLong(monthsNewestFirst[0].month)}`}
            />

            <StatistikDashboard>
                <StatistikStatsBar stats={buildStats(stats)} />
                <StatistikRecords cards={buildRecordCards(overview)} />

                <StatistikColumns>
                    <StatistikPanel
                        title='All-Time Leaderboard'
                        description={
                            <>
                                Die meisten Stimmen über alle Monate.{' '}
                                <Link href={routes.m12gGames}>
                                    Alle {formatInteger(stats.totalUniqueGames)} Spiele ansehen
                                </Link>
                            </>
                        }>
                        <StatistikTopList items={toLeaderboardItems(stats.leaderboard)} />
                    </StatistikPanel>
                    <StatistikPanel title='Hall of Fame' description='Alle Monatssieger, die neuesten zuerst.'>
                        <StatistikTopList items={toHallOfFameItems(stats.winnerTimeline)} ranked={false} />
                    </StatistikPanel>
                </StatistikColumns>

                <StatistikColumns>
                    <StatistikPanel title='Stimmen pro Monat' description='Wie viele Stimmen jeden Monat abgegeben wurden.'>
                        <StatistikBarList items={voteItems} highlightMax />
                    </StatistikPanel>
                    <StatistikPanel title='Spiele pro Monat' description='Wie viele Spiele jeden Monat nominiert waren.'>
                        <StatistikBarList items={gameCountItems} tone='secondary' highlightMax />
                    </StatistikPanel>
                </StatistikColumns>
            </StatistikDashboard>

            <h2>Alle Abstimmungen</h2>
            <ContentGrid gap='comfortable'>
                {monthsNewestFirst.map((month) => (
                    <M12GMonthCard key={month.month} month={month} />
                ))}
            </ContentGrid>
        </div>
    );
}
