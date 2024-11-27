import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  region: text('region').notNull(),
});
