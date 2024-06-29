const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const dotenv = require('dotenv');
const postgres = require('postgres');

// setup process.env from .env file
dotenv.config({
  path: process.argv[2],
});

const sql = postgres(process.env.DATABASE_URL);

const db = drizzle(sql);

migrate(db, { migrationsFolder: './drizzle' }).finally(sql.end);
