import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/dbtlabs/users';
import { getOrganisation } from '@/connectors/dbtlabs/organisation';
import { env } from '@/common/env';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  serviceToken: string;
  accountId: string;
  accessUrl: string;
};

const isDevelopment = !env.VERCEL_ENV || env.VERCEL_ENV === 'development';

export const registerOrganisation = async ({
  organisationId,
  region,
  serviceToken,
  accountId,
  accessUrl,
}: SetupOrganisationParams) => {
  // For testing purposes, we user trail account & we don't want to check the plan and stage of the organisation
  if (!isDevelopment || process.env.NODE_ENV === 'test') {
    const { plan } = await getOrganisation({ serviceToken, accountId, accessUrl });

    if (['cancelled', 'cancelled_2022', 'free', 'developer', 'developer_2022'].includes(plan)) {
      return {
        isInvalidPlan: true,
      };
    }
  }

  const encryptedServiceToken = await encrypt(serviceToken);

  await getUsers({ serviceToken, accountId, accessUrl, page: null });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      accountId,
      serviceToken: encryptedServiceToken,
      accessUrl,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accountId,
        region,
        serviceToken: encryptedServiceToken,
      },
    });

  await inngest.send([
    {
      name: 'dbtlabs/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'dbtlabs/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
