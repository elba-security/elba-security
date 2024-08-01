import { encrypt } from '@/common/crypto';
import { getOrganizationId } from '@/connectors/elastic/organization';
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
  await getOrganizationId({ apiKey });

  const encodedToken = await encrypt(apiKey);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, apiKey: encodedToken })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiKey: encodedToken,
      },
    });

  await inngest.send([
    {
      name: 'elastic/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
      },
    },
    {
      name: 'elastic/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
