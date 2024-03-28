import { z } from 'zod';
import { addSeconds } from 'date-fns';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { checkAdmin, getInstance, getToken } from '@/connectors/confluence/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

export const searchParamsSchema = z.object({
  code: z.string().min(1),
});

export const handleInstallation = async ({
  organisationId,
  searchParams: { code },
  region,
}: {
  organisationId: string;
  searchParams: { code: string };
  region: string;
}) => {
  const { accessToken, refreshToken, expiresIn } = await getToken(code);

  const instance = await getInstance(accessToken);

  if (!instance) {
    throw new Error('Could not retrieve a connected instance');
  }

  const isAdmin = await checkAdmin({ instanceId: instance.id, accessToken });

  if (!isAdmin) {
    throw new Error('Connected user is not an instance admin');
  }

  const encryptedAccessToken = await encrypt(accessToken);
  const encryptedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      instanceId: instance.id,
      instanceUrl: instance.url,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        instanceId: instance.id,
        instanceUrl: instance.url,
        region,
      },
    });

  await inngest.send([
    {
      name: 'confluence/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        cursor: null,
      },
    },
    {
      name: 'confluence/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
    {
      name: 'confluence/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
