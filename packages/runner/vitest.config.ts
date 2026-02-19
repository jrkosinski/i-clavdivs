import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/*.config.*', '**/tests/**'],
        },
    },
    resolve: {
        alias: {
            '@i-clavdivs/models': resolve(__dirname, '../models/src/index.ts'),
            '@i-clavdivs/agents': resolve(__dirname, '../agents/src/index.ts'),
        },
    },
});
