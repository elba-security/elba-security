import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  accountId: text('account_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  region: text('region').notNull(),
  apiKey: text('api_key').notNull(),
});
