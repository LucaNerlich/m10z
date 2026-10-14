'use client';

import {useState} from 'react';
import Link from 'next/link';
import Fuse, {type IFuseOptions} from 'fuse.js';

import {type M12GGameIndexEntry} from '@/src/lib/m12g/types';
import {formatMonthCompact, formatVotes} from '@/src/lib/m12g/formatters';
import {routes} from '@/src/lib/routes';

import styles from './M12GGameIndex.module.css';

type M12GGameIndexProps = {
    games: M12GGameIndexEntry[];
};

const FUSE_OPTIONS: IFuseOptions<M12GGameIndexEntry> = {
    keys: ['name'],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
};

export function M12GGameIndex({games}: M12GGameIndexProps) {
    const [query, setQuery] = useState('');

    // `reactCompiler: true` (next.config.ts) memoises these; manual wrappers only
    // added dependency arrays that can silently go stale.
    const fuse = new Fuse(games, FUSE_OPTIONS);

    const trimmedQuery = query.trim();
    const filteredGames =
        trimmedQuery.length < 2 ? games : fuse.search(trimmedQuery).map((result) => result.item);

    const maxVotes = filteredGames.length === 0 ? 1 : Math.max(...filteredGames.map((g) => g.totalVotes));

    const isFiltered = query.trim().length >= 2;

    return (
        <section className={styles.wrapper}>
            <div className={styles.searchRow}>
                <input
                    type="search"
                    className={styles.searchInput}
                    placeholder="Spiel suchen..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Spiele durchsuchen"
                />
                <span className={styles.resultCount}>
                    {isFiltered
                        ? `${filteredGames.length} Treffer`
                        : `${games.length} Spiele`}
                </span>
            </div>

            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Spiel</th>
                    <th aria-label="Stimmen-Balken">{''}</th>
                    <th>Stimmen</th>
                </tr>
                </thead>
                <tbody>
                {filteredGames.length === 0 ? (
                    <tr className={styles.emptyRow}>
                        <td colSpan={3}>
                            Keine Spiele gefunden.
                        </td>
                    </tr>
                ) : (
                    filteredGames.map((game) => (
                        <tr key={game.name}>
                            <td className={styles.nameCell}>
                                <div>
                                    <Link
                                        className={styles.gameLink}
                                        href={routes.m12gGame(game.slug)}>
                                        {game.name}
                                    </Link>
                                    <a
                                        className={styles.externalLink}
                                        href={game.link}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        aria-label={`${game.name} im Store öffnen (öffnet in neuem Fenster)`}>
                                        ↗
                                    </a>
                                    {game.wins > 0 ? (
                                        <span className={styles.winBadge}>
                                                {game.wins}x gewonnen
                                            </span>
                                    ) : null}
                                </div>
                                <div className={styles.monthsList}>
                                    {game.months.map(formatMonthCompact).join(', ')}
                                </div>
                            </td>
                            <td className={styles.barCell}>
                                <meter
                                    className={styles.meter}
                                    min={0}
                                    max={maxVotes}
                                    value={game.totalVotes}
                                />
                            </td>
                            <td className={styles.votesCell}>
                                {formatVotes(game.totalVotes)}
                            </td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </section>
    );
}
