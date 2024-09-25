import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getWorkspaceName } from '@/connectors/segment/users';
import { encrypt } from '@/common/crypto';

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
  const { workspaceName } = await getWorkspaceName({ token });

  const encryptedToken = await encrypt(token);
  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      token: encryptedToken,
      workspaceName,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        token: encryptedToken,
        workspaceName,
      },
    });

  await inngest.send([
    {
      name: 'segment/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'segment/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
