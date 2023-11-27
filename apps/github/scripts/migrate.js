/* eslint-disable turbo/no-undeclared-env-vars -- this is a scripts */
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const dotenv = require('dotenv');
const postgres = require('postgres');

// setup process.env from .env file
dotenv.config({
  path: process.argv[2],
});

const sql = postgres({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  db: process.env.POSTGRES_DATABASE,
});

const db = drizzle(sql);

migrate(db, { migrationsFolder: './drizzle' }).finally(sql.end);
