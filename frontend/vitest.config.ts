import path from 'node:path';

import {defineConfig} from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {'@': path.resolve(__dirname, '.')},
    },
    test: {
        environment: 'node',
        // Component tests are `.tsx` (and opt into jsdom per file with
        // `// @vitest-environment jsdom`); logic tests stay `.ts` under node.
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'app/**/*.test.ts', 'app/**/*.test.tsx'],
        globals: false,
    },
});
