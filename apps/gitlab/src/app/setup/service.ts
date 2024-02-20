import { addMinutes } from 'date-fns/addMinutes';
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
  
  // retrieve token from SaaS API using the given code
  const { accessToken, refreshToken, expiresIn } = await getToken(code);

  await db.insert(Organisation).values({ id: organisationId, accessToken, refreshToken, region }).onConflictDoUpdate({
    target: Organisation.id,
    set: {
      accessToken,
      refreshToken,
      region
    },
  });

  await inngest.send([
    {
      name: 'gitlab/users.sync.requested',
      data: {
        organisationId,
        region,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: "",
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'gitlab/gitlab.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
    // schedule a new token refresh loop
    {
      name: 'gitlab/gitlab.token.refresh.requested',
      data: {
        organisationId,
        region,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: addMinutes(new Date(), expiresIn - 5).getTime(),
    },
  ]);
};
