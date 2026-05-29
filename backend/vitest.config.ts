import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        globals: false,
        // Several modules keep mutable module-level state (debounced queues, metrics
        // history). Forks give each test file a fresh module registry.
        pool: 'forks',
    },
});
