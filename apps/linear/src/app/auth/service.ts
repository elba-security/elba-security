import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/linear/auth';
import { getAuthUser } from '@/connectors/linear/users';
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
  const { authUserId, workspaceUrlKey } = await getAuthUser(accessToken);
  const encryptedAccessToken = await encrypt(accessToken);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      authUserId,
      workspaceUrlKey,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        region,
        authUserId,
        workspaceUrlKey,
      },
    });

  await inngest.send([
    {
      name: 'linear/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'linear/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
