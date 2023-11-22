import { resolve } from 'node:path';
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { config } from 'dotenv';

config({ path: '.env.test' });

export default defineConfig({
  test: {
    env: process.env,
    // use: 'node' if your integration is not compatible with edge runtime
    environment: 'edge-runtime',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
