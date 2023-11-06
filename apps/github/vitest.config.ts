/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    setupFiles: ['./msw/setupTestServer.ts'],
    env: {
      ELBA_API_BASE_URL: 'http://foo.bar',
      ELBA_SOURCE_ID: 'e99870a8-8adb-449d-95f5-32e26a7b9b70',
    },
  },
});
