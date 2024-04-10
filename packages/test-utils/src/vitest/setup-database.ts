import { beforeEach } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

// Delete every entries in the database between each tests
beforeEach(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pg = postgres(process.env.DATABASE_URL);
  const db = drizzle(pg);
  await db.execute(sql`DELETE FROM organisations`);
});
