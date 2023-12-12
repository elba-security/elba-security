/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest/setup-test-server.ts'],
    environment: ['edge-runtime'],
    env: {
      ELBA_API_BASE_URL: 'http://foo.bar',
      ELBA_API_KEY: 'some-api-key',
    },
  },
});
