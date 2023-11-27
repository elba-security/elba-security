import { uuid, text, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const tokens = pgTable('tokens', {
  organisationId: uuid('organisation_id').notNull().primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  teamName: text('team_name').notNull(),
  adminTeamMemberId: text('admin_team_member_id').notNull(),
  rootNamespaceId: text('root_namespace_id').notNull(),
  unauthorizedAt: timestamp('unauthorized_at', { mode: 'string' }),
  refreshAfter: timestamp('refresh_after', { mode: 'string' }),
  expiresAt: timestamp('expires_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});
