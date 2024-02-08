import { eq } from 'drizzle-orm';
import { db, organisations } from '@/database';

export type RefreshTokenResult = {
  organisationId: string;
  accessToken: string;
};

export const getOrganisationRefreshToken = async (organisationId: string) => {
  return db
    .select({
      refreshToken: organisations.refreshToken,
    })
    .from(organisations)
    .where(eq(organisations.organisationId, organisationId));
};

export const updateDropboxTokens = async ({ organisationId, accessToken }: RefreshTokenResult) => {
  return db
    .update(organisations)
    .set({
      organisationId,
      accessToken,
      updatedAt: new Date(),
    })
    .where(eq(organisations.organisationId, organisationId))
    .returning({
      organisationId: organisations.organisationId,
      updatedAt: organisations.updatedAt,
    });
};
