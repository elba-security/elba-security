import { encrypt } from '@/common/crypto';
import { getUsers } from '../../connectors/yousign/users';
import { db } from '../../database/client';
import { organisationsTable } from '../../database/schema';
import { inngest } from '../../inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  apiKey: string;
  region: string;
};
export const registerOrganisation = async ({
  organisationId,
  apiKey,
  region,
}: SetupOrganisationParams) => {
  await getUsers({ apiKey, after: null });

  const encryptedToken = await encrypt(apiKey);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, apiKey: encryptedToken })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiKey: encryptedToken,
      },
    });

  await inngest.send([
    {
      name: 'yousign/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'yousign/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
