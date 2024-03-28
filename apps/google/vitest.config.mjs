import { resolve } from 'node:path';
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand'

const env = config({ path: '.env.test' });
const { error } = expand(env)

if (error) {
  throw new Error(`Could not find environment variables file: .env.test`);
}

export default defineConfig({
  test: {
    setupFiles: ['./vitest/setup-database.ts', './vitest/setup-msw-handlers.ts'],
    env: process.env,
    // use 'node' if your integration is not compatible with edge runtime
    environment: 'edge-runtime',
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
