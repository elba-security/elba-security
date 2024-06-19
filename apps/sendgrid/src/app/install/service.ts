import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/sendgrid/users';

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
  const encodedApiKey = await encrypt(apiKey);

  await getUsers({ apiKey, offset: 0 });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      apiKey: encodedApiKey,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiKey: encodedApiKey,
      },
    });

  await inngest.send([
    {
      name: 'sendgrid/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: 0,
      },
    },
    // this will cancel scheduled key refresh if it exists
    {
      name: 'sendgrid/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
