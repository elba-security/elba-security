import { type InferSelectModel } from 'drizzle-orm';
import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  googleCustomerId: text('google_customer_id').notNull(),
  googleAdminEmail: text('google_admin_email').notNull(),
});

export type Organisation = InferSelectModel<typeof organisationsTable>;
