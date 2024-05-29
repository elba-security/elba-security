import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/intercom/auth';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';

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

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, accessToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: await decrypt(accessToken),
        region,
      },
    });

  await inngest.send([
    {
      name: 'intercom/users.sync.requested',
      data: {
        organisationId,
        region,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'intercom/app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
