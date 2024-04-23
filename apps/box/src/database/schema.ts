import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel } from 'drizzle-orm';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at')
    .default(sql`now()`)
    .notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof organisationsTable>;
