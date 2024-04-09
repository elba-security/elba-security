import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['@elba-security/test-utils/vitest/setup-msw-handlers'],
    environment: 'edge-runtime',
    env: {
      ELBA_API_BASE_URL: 'http://foo.us.bar',
      ELBA_API_KEY: 'some-api-key',
    },
  },
});
