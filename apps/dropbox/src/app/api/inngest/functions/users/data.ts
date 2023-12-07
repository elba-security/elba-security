import { db, tokens } from '@/database';
import { and, gte, isNull } from 'drizzle-orm';

export const getOrganisationsToSyncUsers = async () => {
  return await db
    .select({
      organisationId: tokens.organisationId,
      accessToken: tokens.accessToken,
    })
    .from(tokens)
    .where(and(gte(tokens.expiresAt, new Date()), isNull(tokens.unauthorizedAt)));
};
