import type { InferSelectModel } from 'drizzle-orm';
import { uuid, text, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  apiKey: text('service_token').notNull(),
  region: text('region').notNull(),
});

export type Organisation = InferSelectModel<typeof organisationsTable>;
