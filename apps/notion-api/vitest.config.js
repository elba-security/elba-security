/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    env: {
      CRON_SECRET: '1234',
    },
  },
});
