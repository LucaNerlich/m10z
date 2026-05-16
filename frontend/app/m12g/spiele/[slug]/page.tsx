import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {M12GGameDetail, type GameTimelineEntry} from '@/src/components/M12GGameDetail';
import {buildGameHistory} from '@/src/lib/m12g/gameHistory';
import {fetchM12GOverview} from '@/src/lib/m12g/m12gData';
import {type M12GMonthWithWinner} from '@/src/lib/m12g/types';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {routes} from '@/src/lib/routes';

type RouteParams = {slug: string};

export const dynamicParams = false;

export async function generateStaticParams(): Promise<RouteParams[]> {
    const overview = await fetchM12GOverview();
    const history = buildGameHistory(overview.months);
    return history.map((g) => ({slug: g.slug}));
}

async function findGame(slug: string) {
    const overview = await fetchM12GOverview();
    const history = buildGameHistory(overview.months);
    const game = history.find((g) => g.slug === slug);
    if (!game) return null;
    return {game, months: overview.months};
}

export async function generateMetadata({params}: {params: Promise<RouteParams>}): Promise<Metadata> {
    const {slug} = await params;
    const found = await findGame(slug);
    if (!found) {
        return buildStaticListMetadata({
            title: 'Spiel nicht gefunden - M12G',
            description: 'Dieses Spiel wurde nie bei M12G nominiert.',
            path: routes.m12gGames,
            ogImageAlt: 'M12G Spieleindex – Mindestens 10 Zeichen',
        });
    }
    const {game} = found;
    return buildStaticListMetadata({
        title: `${game.name} - M12G`,
        description: `${game.name} bei M12G: ${game.monthsNominated}x nominiert, ${game.wins}x gewonnen, ${game.totalVotes} Stimmen gesamt.`,
        path: routes.m12gGame(game.slug),
        ogImageAlt: `${game.name} bei M12G`,
    });
}

function buildTimeline(name: string, months: M12GMonthWithWinner[]): GameTimelineEntry[] {
    const sorted = [...months].sort((a, b) => b.month.localeCompare(a.month));
    const timeline: GameTimelineEntry[] = [];
    for (const month of sorted) {
        const entry = month.games.find((g) => g.name === name);
        if (!entry) continue;
        timeline.push({
            month: month.month,
            title: month.title,
            forumThreadUrl: month.forumThreadUrl,
            votes: entry.votes,
            isWinner: month.winners.some((w) => w.name === name),
        });
    }
    return timeline;
}

export default async function M12GGamePage({params}: {params: Promise<RouteParams>}) {
    const {slug} = await params;
    const found = await findGame(slug);
    if (!found) notFound();

    const timeline = buildTimeline(found.game.name, found.months);

    return (
        <div data-content-page>
            <M12GGameDetail game={found.game} timeline={timeline} />
        </div>
    );
}
