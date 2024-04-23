import { getUsers } from '@/connectors/openai/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  apiKey: string;
  sourceOrganizationId: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  apiKey,
  sourceOrganizationId,
  region,
}: SetupOrganisationParams) => {
  // dumb check to see if the provided configuration works
  await getUsers({ apiKey, organizationId: sourceOrganizationId });

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, organizationId: sourceOrganizationId, region, apiKey })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        apiKey,
        organizationId: sourceOrganizationId,
      },
    });

  await inngest.send([
    {
      name: 'openai/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        region,
        syncStartedAt: Date.now(),
      },
    },
    {
      name: 'openai/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
