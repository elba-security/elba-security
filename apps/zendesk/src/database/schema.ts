import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  authUserId: text('auth_user_id').notNull(),
  accessToken: text('access_token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  ownerId: text('owner_id').notNull(),
  region: text('region').notNull(),
  subDomain: text('subdomain').notNull(),
});
