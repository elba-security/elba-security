const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const { config } = require('dotenv');
const postgres = require('postgres');

config({
  path: process.argv[2],
});

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
migrate(db, { migrationsFolder: './drizzle' }).finally(client.end);
