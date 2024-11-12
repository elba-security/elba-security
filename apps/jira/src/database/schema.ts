import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  apiToken: text('api_token').notNull(),
  domain: text('domain').notNull(),
  email: text('email').notNull(),
  authUserId: text('auth_user_id').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
