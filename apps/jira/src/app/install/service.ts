import { encrypt } from '@/common/crypto';
import { getOwnerId } from '../../connectors/jira/users';
import { db } from '../../database/client';
import { organisationsTable } from '../../database/schema';
import { inngest } from '../../inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  apiToken: string;
  domain: string;
  email: string;
  region: string;
};
export const registerOrganisation = async ({
  organisationId,
  apiToken,
  domain,
  email,
  region,
}: SetupOrganisationParams) => {
  const { ownerId } = await getOwnerId({ apiToken, domain, email });

  const encodedtoken = await encrypt(apiToken);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, apiToken: encodedtoken, domain, email, ownerId })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiToken: encodedtoken,
        domain,
        email,
        ownerId,
      },
    });

  await inngest.send([
    {
      name: 'jira/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'jira/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
