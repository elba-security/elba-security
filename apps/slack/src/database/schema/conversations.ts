import { relations } from 'drizzle-orm';
import { pgTable, text, boolean, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { teamsTable } from './teams';

export const conversationsTable = pgTable(
  'conversations',
  {
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id, { onDelete: 'cascade', onUpdate: 'restrict' }),
    id: text('id').notNull(),
    name: text('name').notNull(),
    isSharedExternally: boolean('is_shared_externally').notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.teamId, table.id] }),
    };
  }
);

export type NewConversation = typeof conversationsTable.$inferInsert;

export const conversationsRelations = relations(conversationsTable, ({ one }) => ({
  team: one(teamsTable, {
    fields: [conversationsTable.teamId],
    references: [teamsTable.id],
  }),
}));
