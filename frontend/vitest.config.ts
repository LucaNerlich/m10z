import path from 'node:path';

import {defineConfig} from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {'@': path.resolve(__dirname, '.')},
    },
    test: {
        environment: 'node',
        // Production builds (Docker/Coolify set NODE_ENV=production before running
        // `pnpm run build`, which runs vitest first) make React resolve its
        // *production* entry, which does not export `act` - every component test
        // then dies with "act is not a function". Vitest only defaults NODE_ENV to
        // 'test' when nothing set it, so pin it for the test run.
        env: {NODE_ENV: 'test'},
        // Component tests are `.tsx` (and opt into jsdom per file with
        // `// @vitest-environment jsdom`); logic tests stay `.ts` under node.
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'app/**/*.test.ts', 'app/**/*.test.tsx'],
        globals: false,
    },
});
