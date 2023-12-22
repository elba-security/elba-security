import { tokens, db } from '@/database';
import { eq } from 'drizzle-orm';

export const getOrganisationsAccessToken = async (organisationId: string) => {
  return await db
    .select({
      accessToken: tokens.accessToken,
      pathRoot: tokens.rootNamespaceId,
      adminTeamMemberId: tokens.adminTeamMemberId,
    })
    .from(tokens)
    .where(eq(tokens.organisationId, organisationId));
};
