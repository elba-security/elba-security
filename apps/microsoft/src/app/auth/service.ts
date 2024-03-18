import { addSeconds } from 'date-fns/addSeconds';
import type { InstallationHandler } from '@elba-security/app-core/nextjs';
import { z } from 'zod';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/microsoft/auth';
import { encrypt } from '@/common/crypto';

export const searchParamsSchema = z.object({
  adminConsent: z.preprocess(
    (value) => typeof value === 'string' && value.toLocaleLowerCase() === 'true',
    z.literal(true)
  ),
  tenantId: z.string().min(1),
});

export const handleInstallation: InstallationHandler<typeof searchParamsSchema> = async ({
  organisationId,
  region,
  searchParams: { tenantId },
}) => {
  const { token, expiresIn } = await getToken(tenantId);

  const encodedToken = await encrypt(token);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, tenantId, token: encodedToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        tenantId,
        token: encodedToken,
        region,
      },
    });

  return {
    tokenExpiresAt: addSeconds(new Date(), expiresIn),
  };
};
