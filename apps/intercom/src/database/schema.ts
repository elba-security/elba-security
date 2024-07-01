import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  accessToken: text('access_token').notNull(),
  workspaceId: text('workspace_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
