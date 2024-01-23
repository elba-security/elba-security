import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { db, organisations } from '@/database';

export const insertAccessToken = async (
  accessTokenDetails: PgInsertValue<typeof organisations>
) => {
  return await db
    .insert(organisations)
    .values(accessTokenDetails)
    .onConflictDoUpdate({
      target: [organisations.organisationId],
      set: {
        accessToken: accessTokenDetails.accessToken as string,
        refreshToken: accessTokenDetails.refreshToken as string,
        adminTeamMemberId: accessTokenDetails.adminTeamMemberId as string,
        rootNamespaceId: accessTokenDetails.rootNamespaceId as string,
        region: accessTokenDetails.region as string,
      },
    });
};
