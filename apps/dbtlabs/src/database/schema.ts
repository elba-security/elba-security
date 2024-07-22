import type { InferSelectModel } from 'drizzle-orm';
import { uuid, text, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  accountId: text('account_id').notNull(),
  serviceToken: text('service_token').notNull(),
  accessUrl: text('access_url').notNull(),
  region: text('region').notNull(),
});

export type Organisation = InferSelectModel<typeof organisationsTable>;
