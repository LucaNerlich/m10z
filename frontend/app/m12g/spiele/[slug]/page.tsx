import {Suspense} from 'react';
import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {M12GGameDetail} from '@/src/components/M12GGameDetail';
import {getM12GArchive} from '@/src/lib/m12g/m12gArchive';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {routes} from '@/src/lib/routes';

type RouteParams = {slug: string};

export async function generateStaticParams(): Promise<RouteParams[]> {
    const archive = await getM12GArchive();
    return archive.gameHistory.map((g) => ({slug: g.slug}));
}

async function findGame(slug: string) {
    const archive = await getM12GArchive();
    return archive.gameHistory.find((g) => g.slug === slug) ?? null;
}

export async function generateMetadata({params}: {params: Promise<RouteParams>}): Promise<Metadata> {
    const {slug} = await params;
    const game = await findGame(slug);
    if (!game) {
        return buildStaticListMetadata({
            title: 'Spiel nicht gefunden - M12G',
            description: 'Dieses Spiel wurde nie bei M12G nominiert.',
            path: routes.m12gGames,
            ogImageAlt: 'M12G Spieleindex – Mindestens 10 Zeichen',
        });
    }
    return buildStaticListMetadata({
        title: `${game.name} - M12G`,
        description: `${game.name} bei M12G: ${game.monthsNominated}x nominiert, ${game.wins}x gewonnen, ${game.totalVotes} Stimmen gesamt.`,
        path: routes.m12gGame(game.slug),
        ogImageAlt: `${game.name} bei M12G`,
    });
}

// `params` is awaited inside the Suspense-wrapped child (not here) so unknown
// slugs — not covered by generateStaticParams — still get a prerendered App Shell.
export default function M12GGamePage({params}: {params: Promise<RouteParams>}) {
    return (
        <Suspense fallback={null}>
            <M12GGameContent params={params} />
        </Suspense>
    );
}

async function M12GGameContent({params}: {params: Promise<RouteParams>}) {
    const {slug} = await params;
    const game = await findGame(slug);
    if (!game) notFound();

    return (
        <div data-content-page>
            <M12GGameDetail game={game} />
        </div>
    );
}
