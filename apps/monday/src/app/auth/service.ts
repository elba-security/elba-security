import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/monday/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '../../common/crypto';

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
  const { access_token: accessToken } = await getToken(code);

  const encryptedToken = await encrypt(accessToken);
  await db
    .insert(organisationsTable)
    .values({ id: organisationId, token: encryptedToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        token: encryptedToken,
      },
    });

  await inngest.send([
    {
      name: 'monday/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: 1,
      },
    },
    {
      name: 'monday/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
