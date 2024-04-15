import { uuid, text, pgTable } from 'drizzle-orm/pg-core';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  accountId: text('accountId').notNull(),
  serviceToken: text('serviceToken').notNull(),
  accessUrl: text('accessUrl').notNull(),
  region: text('region').notNull(),
});
