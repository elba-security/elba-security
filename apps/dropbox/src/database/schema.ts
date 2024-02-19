import { uuid, text, timestamp, pgTable, primaryKey } from 'drizzle-orm/pg-core';

export const organisations = pgTable('organisations', {
  organisationId: uuid('id').notNull().primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  adminTeamMemberId: text('admin_team_member_id').notNull(),
  rootNamespaceId: text('root_namespace_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  region: text('region').notNull(),
});

export const sharedLinks = pgTable(
  'shared_links',
  {
    id: text('id').notNull(),
    url: text('url').notNull(),
    organisationId: uuid('organisation_id').notNull(),
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
