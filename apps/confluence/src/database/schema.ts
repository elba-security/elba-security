import { uuid, text, timestamp, pgTable, unique } from 'drizzle-orm/pg-core';

export const usersTable = pgTable(
  'users',
  {
    id: text('id').notNull(),
    organisationId: uuid('organisation_id').notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull(),
    publicName: text('public_name').notNull(),
    displayName: text('display_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.organisationId, t.id),
  })
);
