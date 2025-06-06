import { type InferSelectModel } from 'drizzle-orm';
import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  region: text('region').notNull(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Organisation = InferSelectModel<typeof organisationsTable>;
