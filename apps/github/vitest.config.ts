/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    setupFiles: ['./msw/setupTestServer.ts'],
    env: {
      CRON_SECRET: '1234',
      ELBA_API_BASE_URL: 'http://foo.bar',
      ELBA_SOURCE_ID: 'e99870a8-8adb-449d-95f5-32e26a7b9b70',
      NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL: 'https://github-install-link.com',
      GITHUB_PRIVATE_KEY: 'github-private-key',
      GITHUB_APP_ID: '123456',
      GITHUB_CLIENT_ID: 'github-client-id',
      GITHUB_CLIENT_SECRET: 'github-client-secret',
      POSTGRES_HOST: '0.0.0.0',
      POSTGRES_PORT: '5555',
      POSTGRES_USERNAME: 'postgres-username',
      POSTGRES_PASSWORD: 'postgres-password',
      POSTGRES_DATABASE: 'postgres-database',
      USERS_SYNC_BATCH_SIZE: '5',
      USERS_SYNC_MAX_RETRY: '3',
    },
  },
});
