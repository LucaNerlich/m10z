import {type Metadata} from 'next';

import {fetchM12GOverview} from '@/src/lib/m12g/m12gData';
import {computeM12GStats} from '@/src/lib/m12g/m12gStats';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {ContentGrid} from '@/src/components/ContentGrid';
import {M12GMonthCard} from '@/src/components/M12GMonthCard';
import {M12GStatsBar} from '@/src/components/M12GStatsBar';
import {M12GWinnerTimeline} from '@/src/components/M12GWinnerTimeline';
import {M12GLeaderboard} from '@/src/components/M12GLeaderboard';
import {M12GParticipationChart} from '@/src/components/M12GParticipationChart';
import {EmptyState} from '@/src/components/EmptyState';

export const metadata: Metadata = {
    title: 'M12G Statistik',
    description: 'Monatliche Community-Abstimmungen zu M12G mit den jeweiligen Gewinnern.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/m12g'),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                width: 1200,
                height: 630,
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute('/m12g'),
    },
};

export default async function M12GPage() {
    const overview = await fetchM12GOverview();
    const months = overview.months;
    const stats = computeM12GStats(months);

    return (
        <main data-list-page>
            <div
                style={{
                    background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    display: 'inline-block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                }}
            >
                Beta
            </div>
            <h1>M12G Statistik</h1>

            {months.length === 0 ? (
                <EmptyState message="Keine M12G-Abstimmungen gefunden." />
            ) : (
                <>
                    <section style={{display: 'grid', gap: '20px', marginBottom: '40px'}}>
                        <M12GStatsBar
                            totalMonths={stats.totalMonths}
                            totalUniqueGames={stats.totalUniqueGames}
                            totalVotes={stats.totalVotes}
                            avgVotesPerMonth={stats.avgVotesPerMonth}
                        />
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
                                gap: '20px',
                            }}
                        >
                            <M12GWinnerTimeline winners={stats.winnerTimeline} />
                            <M12GParticipationChart months={stats.monthlyParticipation} />
                        </div>
                        <M12GLeaderboard entries={stats.leaderboard} />
                    </section>

                    <h2>Alle Abstimmungen</h2>
                    <ContentGrid gap="comfortable">
                        {months.map((month) => (
                            <M12GMonthCard key={month.month} month={month} />
                        ))}
                    </ContentGrid>
                </>
            )}
        </main>
    );
}
