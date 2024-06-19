import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/aircall/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
}: SetupOrganisationParams) => {
  const { accessToken } = await getToken(code);
  const encryptedToken = await encrypt(accessToken);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, accessToken: encryptedToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'aircall/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'aircall/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
