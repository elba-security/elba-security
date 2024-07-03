import { uuid, text, timestamp, pgTable, integer } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  timeZone: text('timezone').notNull(),
  domain: text('domain').notNull(),
  portalId: integer('portal_id').notNull(),
});
