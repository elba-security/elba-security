import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  accountId: uuid('account_id').notNull(),
  authUserId: uuid('auth_user_id').notNull(),
  apiBaseUri: text('api_base_uri').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Organisation = InferSelectModel<typeof organisationsTable>;
