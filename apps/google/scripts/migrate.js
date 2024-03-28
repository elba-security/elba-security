const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const dotenv = require('dotenv');
const postgres = require('postgres');
const { expand } = require('dotenv-expand');

// setup process.env from .env file
const env = dotenv.config({
  path: process.argv[2],
});

expand(env);

const sql = postgres(process.env.DATABASE_URL);

const db = drizzle(sql);

migrate(db, { migrationsFolder: './drizzle' }).finally(sql.end);
