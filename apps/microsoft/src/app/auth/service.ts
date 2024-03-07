import { addSeconds } from 'date-fns/addSeconds';
import { z } from 'zod';
import type { InstallationHandler } from '@elba-security/nextjs';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/microsoft/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

export const searchParamsSchema = z.object({
  admin_consent: z.preprocess(
    (value) => typeof value === 'string' && value.toLocaleLowerCase() === 'true',
    z.literal(true)
  ),
  tenant: z.string().min(1),
});

export const handleInstallation: InstallationHandler<typeof searchParamsSchema> = async ({
  organisationId,
  region,
  searchParams: { tenant: tenantId },
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

  await inngest.send([
    {
      name: 'microsoft/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'microsoft/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        skipToken: null,
      },
    },
    {
      name: 'microsoft/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
