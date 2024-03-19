import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

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

  const encodedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  await db
    .insert(Organisation)
    .values({ id: organisationId, accessToken: encodedAccessToken, refreshToken: encodedRefreshToken, region })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accessToken: encodedAccessToken,
        refreshToken: encodedRefreshToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'pagerduty/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'pagerduty/pagerduty.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
    {
      name: 'pagerduty/pagerduty.token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
