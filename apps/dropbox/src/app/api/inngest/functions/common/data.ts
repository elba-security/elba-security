import { and, gte, isNull } from 'drizzle-orm';
import { db, tokens } from '@/database';

export const getOrganisationsToSyncJobs = async () => {
  return db
    .select({
      organisationId: tokens.organisationId,
      accessToken: tokens.accessToken,
      pathRoot: tokens.rootNamespaceId,
      adminTeamMemberId: tokens.adminTeamMemberId,
    })
    .from(tokens)
    .where(and(gte(tokens.expiresAt, new Date()), isNull(tokens.unauthorizedAt)));
};
