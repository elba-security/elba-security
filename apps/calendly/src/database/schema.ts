import { extendOrganisationTable } from '@elba-security/database';
import { text } from 'drizzle-orm/pg-core';

export const organisationsTable = extendOrganisationTable({
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  organizationUri: text('organization_uri').notNull(),
  authUserUri: text('auth_user_uri').notNull(),
});
