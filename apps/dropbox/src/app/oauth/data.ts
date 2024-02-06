import { db, organisations } from '@/database';

export const insertAccessToken = async (accessTokenDetails: typeof organisations.$inferInsert) => {
  return await db
    .insert(organisations)
    .values(accessTokenDetails)
    .onConflictDoUpdate({
      target: [organisations.organisationId],
      set: {
        accessToken: accessTokenDetails.accessToken,
        refreshToken: accessTokenDetails.refreshToken,
        adminTeamMemberId: accessTokenDetails.adminTeamMemberId,
        rootNamespaceId: accessTokenDetails.rootNamespaceId,
        region: accessTokenDetails.region,
      },
    });
};
