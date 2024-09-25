import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  token: text('api_key').notNull(),
  region: text('region').notNull(),
  workspaceName: text('workspace_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
