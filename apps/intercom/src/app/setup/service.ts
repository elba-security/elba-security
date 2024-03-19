import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
import { inngest } from '@/inngest/client';

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
    .insert(Organisation)
    .values({ id: organisationId, accessToken, region })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accessToken,
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
      name: 'intercom/intercom.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
