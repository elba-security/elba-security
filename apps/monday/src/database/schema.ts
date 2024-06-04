import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  accessToken: text('access_token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  region: text('region').notNull(),
});
