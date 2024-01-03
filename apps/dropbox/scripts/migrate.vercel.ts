import { drizzle } from 'drizzle-orm/vercel-postgres';
import { migrate } from 'drizzle-orm/vercel-postgres/migrator';
import { createPool } from '@vercel/postgres';
import * as schema from '../src/database/schema';

console.log({
  POSTGRES_URL: process.env.POSTGRES_URL,
});

const migratePostgres = async () => {
  try {
    const db = drizzle(
      createPool({
        connectionString: process.env.POSTGRES_URL,
      }),
      { schema, logger: true }
    );
    console.log('Migrating...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Done!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

migratePostgres().catch((error) => {
  console.error(error);
  process.exit(1);
});
