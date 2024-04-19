import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createDatabaseClient } from '../core/database/client';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  token: text('token').notNull(),
});

export const databaseClient = createDatabaseClient({ organisations: organisationsTable });
