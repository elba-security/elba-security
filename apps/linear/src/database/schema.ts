import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  accessToken: text('access_token').notNull(),
  authUserId: text('auth_user_id').notNull(),
  workspaceUrlKey: text('workspace_url_key').notNull(),
});
