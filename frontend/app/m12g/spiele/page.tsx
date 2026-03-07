import {type Metadata} from 'next';

import {fetchM12GOverview} from '@/src/lib/m12g/m12gData';
import {buildGameIndex} from '@/src/lib/m12g/m12gStats';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {EmptyState} from '@/src/components/EmptyState';

import {M12GGameIndex} from '@/src/components/M12GGameIndex';

export const metadata: Metadata = {
    title: 'Spieleindex - M12G',
    description:
        'Alle Spiele, die jemals bei M12G nominiert wurden, auf einen Blick.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute(routes.m12gGames),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                width: 1200,
                height: 630,
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute(routes.m12gGames),
    },
};

export default async function M12GGamesPage() {
    const overview = await fetchM12GOverview();
    const games = buildGameIndex(overview.months);

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
