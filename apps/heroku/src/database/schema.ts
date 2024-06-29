import { uuid, text, timestamp, pgTable, unique } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').notNull().primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const teamUsersTable = pgTable(
  'team_users',
  {
    userId: text('user_id').notNull(),
    teamId: text('team_id').notNull(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisationsTable.id, { onDelete: 'cascade' }),
    lastSyncAt: timestamp('last_sync_at').defaultNow().notNull(),
  },
  (t) => ({
    // using lastSyncAt allows duplicate data during updates
    unq: unique().on(t.userId, t.teamId, t.organisationId, t.lastSyncAt),
  })
);
