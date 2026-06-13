import path from 'node:path';

import {defineConfig} from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {'@': path.resolve(__dirname, '.')},
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
        globals: false,
    },
});
