import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import type { BuiltinEnvironment } from 'vitest';

const { error } = config({ path: '.env.test' });

if (error) {
  throw new Error(`Could not find environment variables file: .env.test`);
}

const environment: BuiltinEnvironment = 'node';

process.env.VITEST_ENVIRONMENT = environment;

export default defineConfig({
  test: {
    globalSetup: '@elba-security/test-utils/vitest/global-setup',
    setupFiles: [
      '@elba-security/test-utils/vitest/setup-database',
      '@elba-security/test-utils/vitest/setup-msw-handlers',
    ],
    environment,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
