import { resolve } from 'node:path';
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { config } from 'dotenv';

const envFilePath = process.env.VERCEL_ENV ? '.env.test' : '.env.test.local';
const { error } = config({ path: envFilePath });

if (error) {
  throw new Error(`Could not find environment variables file: ${envFilePath}`);
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
