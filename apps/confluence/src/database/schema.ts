import { uuid, text, timestamp, pgTable, unique } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  instanceId: text('instance_id').notNull(),
  instanceUrl: text('instance_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
});

export const usersTable = pgTable(
  'users',
  {
    id: text('id').notNull(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisationsTable.id, { onDelete: 'cascade' }),
    lastSyncAt: timestamp('last_sync_at').notNull(),
    publicName: text('public_name').notNull(),
    displayName: text('display_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.organisationId, t.id),
  })
);
