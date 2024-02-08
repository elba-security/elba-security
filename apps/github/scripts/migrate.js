const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const dotenv = require('dotenv');
const postgres = require('postgres');

// setup process.env from .env file
dotenv.config({
  path: process.argv[2],
});

const sql = postgres({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  db: process.env.DATABASE_DATABASE,
});

const db = drizzle(sql);

migrate(db, { migrationsFolder: './drizzle' }).finally(sql.end);
