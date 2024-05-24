import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import type { BuiltinEnvironment } from 'vitest';

const { error } = config({ path: '.env.test' });

if (error) {
  throw new Error(`Could not find environment variables file: .env.test`);
}

const environment: BuiltinEnvironment = 'edge-runtime';

process.env.VITEST_ENVIRONMENT = environment;

export default defineConfig({
  test: {
    globalSetup: '@elba-security/test-utils/vitest/global-setup',
    setupFiles: [
      // As slack doesn't have an `organisations` table, we can't use the setup database from `@elba-security/test-utils`
      // As a consequence we use this specific script instead to delete data from the `teams` table
      './vitest/setup-database.ts',
      '@elba-security/test-utils/vitest/setup-msw-handlers',
    ],
    environment,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
