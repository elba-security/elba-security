import { uuid, text, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  accountId: text('accountId').notNull(),
  serviceToken: text('serviceToken').notNull(),
  accessUrl: text('accessUrl').notNull(),
  region: text('region').notNull(),
});
