import { and, eq, gte, isNull } from 'drizzle-orm';
import { db, tokens } from '@/database';

export const getOrganisationsToSync = async () => {
  return db
    .select({
      organisationId: tokens.organisationId,
    })
    .from(tokens)
    .where(and(gte(tokens.expiresAt, new Date()), isNull(tokens.unauthorizedAt)));
};

export const getOrganisationAccessDetails = async (organisationId: string) => {
  return db
    .select({
      accessToken: tokens.accessToken,
      pathRoot: tokens.rootNamespaceId,
      adminTeamMemberId: tokens.adminTeamMemberId,
      region: tokens.region,
    })
    .from(tokens)
    .where(eq(tokens.organisationId, organisationId));
};
