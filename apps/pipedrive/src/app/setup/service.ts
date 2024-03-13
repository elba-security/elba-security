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
  const { accessToken, refreshToken, expiresIn, apiDomain } = await getToken(code);
  const encodedAccessToken = await encrypt(accessToken);
  const encodedRefreshToken = await encrypt(refreshToken);

  console.log("accessToken:", accessToken)
  console.log("encodedAccessToken:", encodedAccessToken)
  await db.insert(Organisation).values({ id: organisationId, accessToken, region, refreshToken, apiDomain }).onConflictDoUpdate({
    target: Organisation.id,
    set: {
      accessToken: encodedAccessToken,
      refreshToken: encodedRefreshToken,
      apiDomain,
      region
    },
  });

  await inngest.send([
    {
      name: 'pipedrive/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'pipedrive/pipedrive.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
    {
      name: 'pipedrive/pipedrive.token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
