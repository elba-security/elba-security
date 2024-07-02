import { encrypt } from '@/common/crypto';
import { getUsers } from '../../connectors/livestorm/users';
import { db } from '../../database/client';
import { organisationsTable } from '../../database/schema';
import { inngest } from '../../inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  token: string;
  region: string;
};
export const registerOrganisation = async ({
  organisationId,
  token,
  region,
}: SetupOrganisationParams) => {
  await getUsers(token, null);

  const encryptedToken = await encrypt(token);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, token: encryptedToken })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        token: encryptedToken,
      },
    });

  await inngest.send([
    {
      name: 'livestorm/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'livestorm/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
