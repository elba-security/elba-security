import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { db, tokens } from '@/database';

export const insertAccessToken = async (accessTokenDetails: PgInsertValue<typeof tokens>) => {
  return await db
    .insert(tokens)
    .values(accessTokenDetails)
    .onConflictDoUpdate({
      target: [tokens.organisationId],
      set: {
        accessToken: accessTokenDetails.accessToken as string,
        refreshToken: accessTokenDetails.refreshToken as string,
        teamName: accessTokenDetails.teamName as string,
        adminTeamMemberId: accessTokenDetails.adminTeamMemberId as string,
        rootNamespaceId: accessTokenDetails.rootNamespaceId as string,
        expiresAt: accessTokenDetails.expiresAt as Date,
      },
    });
};
