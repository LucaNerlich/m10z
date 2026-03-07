'use client';

import {useState, useMemo} from 'react';
import Fuse, {type IFuseOptions} from 'fuse.js';

import {type M12GGameIndexEntry} from '@/src/lib/m12g/types';
import {formatVotes, formatMonthCompact} from '@/src/lib/m12g/formatters';

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

    const fuse = useMemo(() => new Fuse(games, FUSE_OPTIONS), [games]);

    const filteredGames = useMemo(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) return games;
        return fuse.search(trimmed).map((result) => result.item);
    }, [query, games, fuse]);

    const maxVotes = useMemo(() => {
        if (filteredGames.length === 0) return 1;
        return Math.max(...filteredGames.map((g) => g.totalVotes));
    }, [filteredGames]);

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
                                        <a
                                            className={styles.gameLink}
                                            href={game.link}
                                            target="_blank"
                                            rel="noreferrer noopener">
                                            {game.name}
                                        </a>
                                        {game.monthsNominated > 1 ? (
                                            <span className={styles.monthsBadge}>
                                                {game.monthsNominated}x nominiert
                                            </span>
                                        ) : null}
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
