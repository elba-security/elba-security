import { db, tokens } from '@/database';
import { and, gte, isNull } from 'drizzle-orm';

export const getOrganisationsToSyncJobs = async () => {
  return await db
    .select({
      organisationId: tokens.organisationId,
      accessToken: tokens.accessToken,
      pathRoot: tokens.rootNamespaceId,
      adminTeamMemberId: tokens.adminTeamMemberId,
    })
    .from(tokens)
    .where(and(gte(tokens.expiresAt, new Date()), isNull(tokens.unauthorizedAt)));
};
