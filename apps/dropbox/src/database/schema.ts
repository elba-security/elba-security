import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

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
