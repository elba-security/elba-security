import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  organizationUri: text('organization_uri').notNull(),
  authUserUri: text('auth_user_uri').notNull(),
});
