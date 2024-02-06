import { env, argv } from 'node:process';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: argv.at(2) });
const client = postgres(env.DATABASE_URL!);
const db = drizzle(client);
migrate(db, { migrationsFolder: './drizzle' }).finally(client.end);
