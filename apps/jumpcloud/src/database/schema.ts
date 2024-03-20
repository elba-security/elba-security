import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  apiKey: text('apiKey').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
