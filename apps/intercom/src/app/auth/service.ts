import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/intercom/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getAuthUser } from '@/connectors/intercom/users';

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
  const authUser = await getAuthUser(accessToken);

  const encryptedAccessToken = await encrypt(accessToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      workspaceId: authUser.app.id_code,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        workspaceId: authUser.app.id_code,
        region,
      },
    });

  await inngest.send([
    {
      name: 'intercom/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'intercom/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
