import { uuid, text, pgTable } from 'drizzle-orm/pg-core';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  accountId: text('accountId').notNull(),
  region: text('region').notNull(),
  personalToken: text('personalToken').notNull(),
  dbtRegion: text('dbtRegion').notNull(),
});
