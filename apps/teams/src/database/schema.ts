import { uuid, text, timestamp, pgTable, unique } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Organisation = pgTable('organisation', {
  id: uuid('id').primaryKey(),
  access_token: text('access_token').notNull(),
  refresh_token: text('refresh_token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof Organisation>;

export const Admin = pgTable(
  'admin',
  {
    id: text('id').notNull().primaryKey(),
    organisationId: uuid('organisation_id')
      .references(() => Organisation.id, { onDelete: 'cascade' })
      .notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.organisationId, t.id),
  })
);
