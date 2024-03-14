import { uuid, text, pgTable } from 'drizzle-orm/pg-core';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  token: text('token').notNull(),
});
