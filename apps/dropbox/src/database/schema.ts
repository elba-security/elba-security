import type { InferSelectModel } from 'drizzle-orm';
import { uuid, text, timestamp, pgTable, primaryKey } from 'drizzle-orm/pg-core';

export const organisationsTable = pgTable('organisations', {
  id: uuid('id').notNull().primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  adminTeamMemberId: text('admin_team_member_id').notNull(),
  rootNamespaceId: text('root_namespace_id').notNull(),
  region: text('region').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Organisation = InferSelectModel<typeof organisationsTable>;

export const sharedLinksTable = pgTable(
  'shared_links',
  {
    id: text('id').notNull(),
    url: text('url').notNull(),
    organisationId: uuid('organisation_id')
      .references(() => organisationsTable.id, {
        onDelete: 'cascade',
        onUpdate: 'restrict',
      })
      .notNull(),
    teamMemberId: text('team_member_id').notNull(),
    linkAccessLevel: text('link_access_level').notNull(),
    pathLower: text('path_lower').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.url, table.pathLower] }),
    };
  }
);

export type SharedLinksDBType = InferSelectModel<typeof sharedLinksTable>;
