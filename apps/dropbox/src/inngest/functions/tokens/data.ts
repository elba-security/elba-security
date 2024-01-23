import { eq } from 'drizzle-orm';
import { db, organisations } from '@/database';

export type RefreshTokenResult = {
  organisationId: string;
  accessToken: string;
};

export const getOrganisationRefreshToken = async (organisationId: string) => {
  try {
    return db
      .select({
        refreshToken: organisations.refreshToken,
      })
      .from(organisations)
      .where(eq(organisations.organisationId, organisationId));
  } catch (error) {
    throw new Error(
      `Not able to get the token details for the organisation with ID: ${organisationId}`,
      {
        cause: error,
      }
    );
  }
};

export const updateDropboxTokens = async ({ organisationId, accessToken }: RefreshTokenResult) => {
  try {
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
  } catch (error) {
    throw Error(
      `Not able to update the token details for the organisation with ID: ${organisationId}`,
      {
        cause: error,
      }
    );
  }
};
