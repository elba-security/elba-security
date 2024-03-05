import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  token: text('token').notNull(),
  sourceOrganizationId: text('source_organization_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
