import {describe, expect, test} from 'vitest';

import adminViteConfig from './vite.config';

describe('admin vite config', () => {
    test('keeps the base config and adds the @ alias', () => {
        const merged = adminViteConfig({resolve: {alias: {'@base': '/base'}}});
        expect(merged.resolve?.alias).toMatchObject({'@': '/src', '@base': '/base'});
    });

    test('excludes public uploads from the dependency scan', () => {
        // Uploaded media can contain .html files (e.g. Auphonic exports) whose
        // inline scripts crash the dev dependency scan. Nothing under public/
        // is admin app code, so the crawl must skip it.
        const merged = adminViteConfig({});
        expect(merged.optimizeDeps?.entries).toEqual(['**/*.html', '!public/**']);
    });
});
