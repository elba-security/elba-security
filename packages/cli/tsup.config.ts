import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: false,
  target: 'esnext',
  clean: true,
  format: 'esm',
  external: [
    'commander',
    'zx',
    'dotenv',
    'path',
    'child_process',
    'ora',
    'drizzle-orm',
    'postgres',
  ],
});
