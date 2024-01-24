import { relations } from 'drizzle-orm';
import { pgTable, text, boolean, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { teams } from './teams';
// import { conversationsExternalUsers } from '@/database/schema/conversations-external-users';

export const conversations = pgTable(
  'conversations',
  {
    teamId: text('team_id')
      .notNull()
      // .primaryKey()
      .references(() => teams.id, { onDelete: 'cascade', onUpdate: 'restrict' }),
    id: text('id').notNull(),
    name: text('name').notNull(),
    // isPrivate: boolean('is_private').notNull(),
    isSharedExternally: boolean('is_shared_externally').notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.teamId, table.id] }),
    };
  }
);

export type NewConversation = typeof conversations.$inferInsert;

export const conversationsRelations = relations(conversations, ({ one }) => ({
  team: one(teams, {
    fields: [conversations.teamId],
    references: [teams.id],
  }),
}));
