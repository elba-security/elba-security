import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  accessToken: text('access_token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof organisationsTable>;
