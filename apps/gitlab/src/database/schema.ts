import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  accessToken: text('accessToken').notNull(),
  refreshToken: text('refreshToken').notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof organisationsTable>;
