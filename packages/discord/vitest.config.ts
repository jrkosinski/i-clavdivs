import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./vitest.setup.ts'],
    },
    resolve: {
        alias: {
            '@i-clavdivs/agent': resolve(__dirname, '../agent/src/index.ts'),
            '@i-clavdivs/agents': resolve(__dirname, '../agents/src/index.ts'),
            '@i-clavdivs/channels': resolve(__dirname, '../channels/src/index.ts'),
            '@i-clavdivs/common': resolve(__dirname, '../common/src/index.ts'),
            '@i-clavdivs/models': resolve(__dirname, '../models/src/index.ts'),
            '@i-clavdivs/plugins': resolve(__dirname, '../plugins/src/index.ts'),
            '@i-clavdivs/workspace': resolve(__dirname, '../workspace/src/index.ts'),
        },
    },
});
