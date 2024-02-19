import type { ElbaDatabaseOrganisationsTable } from '@elba-security/app-core/src/drizzle/database';
import { uuid, integer, text, timestamp, pgTable, unique } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  region: text('region').notNull(),
  installationId: integer('installation_id').unique().notNull(),
  accountLogin: text('account_login').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}) satisfies ElbaDatabaseOrganisationsTable;

export const adminsTable = pgTable(
  'admins',
  {
    id: text('id').notNull().primaryKey(),
    organisationId: uuid('organisation_id')
      .references(() => organisationsTable.id, { onDelete: 'cascade' })
      .notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.organisationId, t.id),
  })
);
