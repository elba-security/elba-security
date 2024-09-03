import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  apiKey: text('api_token').notNull(),
  appKey: text('app_key').notNull(),
  authUserId: text('auth_user_id').notNull(),
  sourceRegion: text('source_region').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
