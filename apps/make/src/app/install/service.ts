import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/make/users';
import { getOrganizations } from '@/connectors/make/organizations';

type SetupOrganisationParams = {
  organisationId: string;
  apiToken: string;
  zoneDomain: string;
  selectedOrganizationId: string;
  region: string;
};

type GetSaasOrganisationParams = {
  apiToken: string;
  zoneDomain: string;
};
export const registerOrganisation = async ({
  organisationId,
  apiToken,
  zoneDomain,
  selectedOrganizationId,
  region,
}: SetupOrganisationParams) => {
  const encodedApiToken = await encrypt(apiToken);

  await getUsers({ apiToken, zoneDomain, selectedOrganizationId });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      apiToken: encodedApiToken,
      zoneDomain,
      selectedOrganizationId,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiToken: encodedApiToken,
        zoneDomain,
        selectedOrganizationId,
      },
    });

  await inngest.send([
    {
      name: 'make/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'make/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};

export const getSaasOrganizations = async ({ apiToken, zoneDomain }: GetSaasOrganisationParams) => {
  const { organizations } = await getOrganizations({ apiToken, zoneDomain });
  return { organizations };
};
