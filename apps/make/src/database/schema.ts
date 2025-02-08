import { uuid, text, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  apiToken: text('api_token').notNull(),
  zoneDomain: text('zone_domain').notNull(),
  selectedOrganizationId: text('selected_organization_id').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
