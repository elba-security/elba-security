import { and, eq } from 'drizzle-orm';
import { db, tokens } from '@/database';

export type RefreshTokenResult = {
  organisationId: string;
  expiresAt: Date;
  accessToken: string;
};

export const getOrganisationRefreshToken = async (organisationId: string) => {
  try {
    return await db
      .select({
        refreshToken: tokens.refreshToken,
      })
      .from(tokens)
      .where(and(eq(tokens.organisationId, organisationId)));
  } catch (error) {
    throw Error(
      `Not able to get the token details for the organisation with ID: ${organisationId}`,
      {
        cause: error,
      }
    );
  }
};

export const updateDropboxTokens = async ({ organisationId, ...rest }: RefreshTokenResult) => {
  try {
    return db
      .update(tokens)
      .set({
        ...rest,
        updatedAt: new Date(),
      })
      .where(eq(tokens.organisationId, organisationId))
      .returning({ organisationId: tokens.organisationId, updatedAt: tokens.updatedAt });
  } catch (error) {
    throw Error(
      `Not able to update the token details for the organisation with ID: ${organisationId}`,
      {
        cause: error,
      }
    );
  }
};
