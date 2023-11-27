import {
  uuid,
  integer,
  text,
  index,
  timestamp,
  pgSchema,
  unique,
  pgTable,
} from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Tokens = pgTable('tokens', {
  organisationId: uuid('organisation_id').notNull().primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  teamName: text('team_name').notNull(),
  adminTeamMemberId: text('admin_team_member_id').notNull(),
  rootNamespaceId: text('root_namespace_id').notNull(),
  unauthorizedAt: timestamp('unauthorized_at'),
  refreshAfter: timestamp('refresh_after'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('updated_at').defaultNow().notNull(),
  updatedAt: timestamp('created_at').defaultNow().notNull(),
});
