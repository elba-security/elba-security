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
  channelId: text('channel_id').notNull(),
  organisationId: uuid('organisation_id')
    .references(() => organisationsTable.id, { onDelete: 'cascade', onUpdate: 'restrict' })
    .notNull(),
  membershipType: text('membership_type').notNull(),
  displayName: text('display_name').notNull(),
});

export const subscriptionsTable = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  organisationId: uuid('organisation_id')
    .references(() => organisationsTable.id, { onDelete: 'cascade', onUpdate: 'restrict' })
    .notNull(),
  resource: text('resource').notNull(),
  changeType: text('change-type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
