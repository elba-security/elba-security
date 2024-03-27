import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  region: text('region').notNull(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const channelsTable = pgTable('channels', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id')
    .references(() => organisationsTable.id)
    .notNull(),
  membershipType: text('membershipType').notNull(),
  displayName: text('displayName').notNull(),
  messages: text('messages').array(),
});

export const subscriptionsTable = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id')
    .references(() => organisationsTable.id)
    .notNull(),
  resource: text('resource').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
