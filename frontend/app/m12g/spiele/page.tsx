import {type Metadata} from 'next';

import {getM12GArchive} from '@/src/lib/m12g/m12gArchive';
import {toGameIndex} from '@/src/lib/m12g/gameHistory';
import {routes} from '@/src/lib/routes';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {EmptyState} from '@/src/components/EmptyState';

import {M12GGameIndex} from '@/src/components/M12GGameIndex';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Spieleindex - M12G',
    description: 'Alle Spiele, die jemals bei M12G nominiert wurden, auf einen Blick.',
    path: routes.m12gGames,
    ogImageAlt: 'M12G Spieleindex – Mindestens 10 Zeichen',
});

export default async function M12GGamesPage() {
    const archive = await getM12GArchive();
    const games = toGameIndex(archive.gameHistory);

    return (
        <div data-list-page>
            <h1>Spieleindex</h1>
            <p style={{color: 'var(--color-text-muted)', margin: '0.5rem 0'}}>
                Alle Spiele, die jemals bei M12G nominiert wurden.
            </p>

            {games.length === 0 ? (
                <EmptyState message="Keine Spiele gefunden." />
            ) : (
                <M12GGameIndex games={games} />
            )}
        </div>
    );
}
