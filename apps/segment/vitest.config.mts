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
    setupFiles: ['@elba-security/test-utils/vitest/setup-msw-handlers'],
    environment,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});