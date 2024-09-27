import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  clientId: text('client_id').notNull(),
  secretId: text('secret_id').notNull(),
  secret: text('secret').notNull(),
  email: text('email').notNull(),
  siteId: text('site_id').notNull(),
  domain: text('domain').notNull(),
  token: text('token').notNull(),
  contentUrl: text('content_url').notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof organisationsTable>;
export type InsertOrganisation = InferInsertModel<typeof organisationsTable>;
