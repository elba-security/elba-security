import { uuid, text, timestamp, pgTable, integer } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  accessToken: text('access_token').notNull(),
  authUserId: text('auth_user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  domain: text('domain').notNull(),
  refreshToken: text('refresh_token').notNull(),
  portalId: integer('portal_id').notNull(),
  timeZone: text('timezone').notNull(),
  region: text('region').notNull(),
});
