import { pgTable, text } from 'drizzle-orm/pg-core';

export const teamsTable = pgTable('teams', {
  id: text('id').notNull().primaryKey(),
  elbaOrganisationId: text('elba_organisation_id').notNull().unique(),
  elbaRegion: text('elba_region').notNull(),
  url: text('url').notNull(),
  token: text('token').notNull(),
  adminId: text('admin_id').notNull(),
});
