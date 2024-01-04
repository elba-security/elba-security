import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { config } from 'dotenv';

config({ path: '.env.test.local' });

interface EnvironmentVariables {
  [key: string]: string;
}

declare let process: {
  env: EnvironmentVariables;
};

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    env: process.env,
    environment: 'node',
    setupFiles: ['./vitest/setup-database.ts', './vitest/setup-test-server.ts'],
  },
});
