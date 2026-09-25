import {promises as fs} from 'node:fs';
import path from 'node:path';
import {cache} from 'react';

import {parseStatistikSnapshot} from './snapshot';
import {buildStatistikDashboard} from './statistikStats';
import {type StatistikDashboard} from './types';

const SNAPSHOT_PATH = path.join('public', 'statistik', 'snapshot.yaml');

/**
 * Reads the committed snapshot and derives the dashboard. Returns `null` when the
 * snapshot is missing or invalid so the page can render an empty state instead of failing.
 */
export const getStatistikDashboard = cache(async (): Promise<StatistikDashboard | null> => {
    try {
        const raw = await fs.readFile(path.join(process.cwd(), SNAPSHOT_PATH), 'utf8');
        return buildStatistikDashboard(parseStatistikSnapshot(raw));
    } catch (error) {
        const code = (error as NodeJS.ErrnoException | null)?.code;
        if (code !== 'ENOENT') {
            console.error('[statistik] Failed to load snapshot:', error instanceof Error ? error.message : error);
        }
        return null;
    }
});
