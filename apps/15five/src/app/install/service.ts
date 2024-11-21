import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/fifteenfive/users';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  apiKey: string;
  authUserEmail: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  apiKey,
  authUserEmail,
  region,
}: SetupOrganisationParams) => {
  await getUsers({ apiKey });
  const encryptedToken = await encrypt(apiKey);
  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      apiKey: encryptedToken,
      authUserEmail,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        apiKey: encryptedToken,
        authUserEmail,
      },
    });

  await inngest.send([
    {
      name: 'fifteenfive/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'fifteenfive/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
