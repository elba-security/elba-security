import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

export const setupOrganisation = async ({
  organisationId,
  token,
  region,
}: {
  organisationId: string;
  token: string;
  region: string;
}) => {
  const encryptedAccessToken = await encrypt(token);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'monday/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'monday/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
