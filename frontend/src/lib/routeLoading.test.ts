import {readdirSync, statSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, test} from 'vitest';

const APP_DIR = path.join(process.cwd(), 'app');

function collectLoadingFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
            results.push(...collectLoadingFiles(full));
        } else if (entry === 'loading.tsx' || entry === 'loading.ts' || entry === 'loading.js') {
            results.push(path.relative(APP_DIR, full));
        }
    }
    return results;
}

describe('App Router loading files', () => {
    test('does not use route-level loading.tsx', () => {
        // Route-level loading files wrap the segment in a special App Router
        // Suspense boundary. On Next 16.2/16.3 that boundary can leave client
        // navigations to [slug] pages stuck or throw chunk-load errors.
        expect(collectLoadingFiles(APP_DIR)).toEqual([]);
    });
});
