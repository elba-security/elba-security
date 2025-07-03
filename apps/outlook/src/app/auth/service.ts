import { getToken } from '@/connectors/microsoft/auth';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/microsoft/user';
import { db } from '@/database/client';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  tenantId: string;
};

export const setupOrganisation = async ({
  organisationId,
  region,
  tenantId,
}: SetupOrganisationParams) => {
  const { token } = await getToken(tenantId);

  try {
    // we test the installation: microsoft API takes time to propagate it through its services
    await getUsers({ token, tenantId, skipToken: null });
  } catch (err) {
    return { isAppInstallationCompleted: false };
  }

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      tenantId,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        tenantId,
        region,
      },
    });

  await inngest.send([
    {
      name: 'outlook/common.organisation.inserted',
      data: {
        organisationId,
      },
    },
    {
      name: 'outlook/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        skipToken: null,
      },
    },
  ]);

  return { isAppInstallationCompleted: true };
};
