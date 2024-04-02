import { relations, type InferSelectModel } from 'drizzle-orm';
import { uuid, text, timestamp, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { organisationsTable } from './organisations';

export const usersTable = pgTable(
  'users',
  {
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisationsTable.id, { onDelete: 'cascade', onUpdate: 'restrict' }),
    id: text('user_id').notNull(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.organisationId, table.id] }),
    };
  }
);

export type User = InferSelectModel<typeof usersTable>;

export const usersRelations = relations(usersTable, ({ one }) => ({
  organisation: one(organisationsTable, {
    fields: [usersTable.organisationId],
    references: [organisationsTable.id],
  }),
}));
