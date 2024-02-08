import { resolve } from 'node:path';
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config({ path: '.env.test' });

interface EnvironmentVariables {
  [key: string]: string;
}

declare let process: {
  env: EnvironmentVariables;
};

export default defineConfig({
  test: {
    setupFiles: ['./vitest/setup-database.ts', './vitest/setup-test-server.ts'],
    env: process.env,
    environment: 'node',
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
