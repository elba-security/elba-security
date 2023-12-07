import { InferModel, InferSelectModel, and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { db, tokens } from '@/database';
import { addMinutes } from 'date-fns';
import { RefreshTokenResult } from './run-refresh-tokens';

const EXPIRES_BEFORE = 30;

export type TokensToRefresh = Awaited<ReturnType<typeof getExpiringDropboxTokens>>;
export type RefreshTokens = Pick<
  InferSelectModel<typeof tokens>,
  'accessToken' | 'expiresAt' | 'refreshAfter' | 'unauthorizedAt' | 'organisationId'
>;

export const getExpiringDropboxTokens = async () => {
  try {
    return await db
      .select({
        organisationId: tokens.organisationId,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      })
      .from(tokens)
      .orderBy(asc(tokens.expiresAt))
      .where(
        and(
          lte(tokens.expiresAt, addMinutes(new Date(), EXPIRES_BEFORE)),
          isNull(tokens.unauthorizedAt),
          or(isNull(tokens.refreshAfter), lte(tokens.refreshAfter, new Date()))
        )
      );
  } catch (error) {
    throw error;
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
    throw error;
  }
};
