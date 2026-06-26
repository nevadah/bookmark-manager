import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    fileParallelism: false,
    include: ['src/test/**/*.test.ts'],
    env: loadEnv('test', process.cwd(), ''),
  },
});
