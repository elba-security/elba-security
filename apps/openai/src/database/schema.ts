import type { InferSelectModel } from 'drizzle-orm';
import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  apiKey: text('api_key').notNull(),
  organizationId: text('organization_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Organisation = InferSelectModel<typeof organisationsTable>;
