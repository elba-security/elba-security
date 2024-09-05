import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  apiKey: text('api_key').notNull(),
  apiSecret: text('api_secret').notNull(),
  authUserId: text('auth_user_id').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
