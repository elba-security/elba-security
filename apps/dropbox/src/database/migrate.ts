import { env, argv } from 'node:process';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const envFileName = argv.at(2);

if (!envFileName) {
  throw new Error(
    'Could not find environment file. Please specify the path to the environment file as the first argument.\nUsage: npx ts-node ./src/database/migrate.ts <env-file>'
  );
}

config({ path: envFileName });

const client = postgres(env.POSTGRES_URL!);

const migratePostgres = async () => {
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: './drizzle' });
  } catch (error) {
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

migratePostgres().catch(() => process.exit(1));
