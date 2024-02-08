import { addMinutes } from 'date-fns/addMinutes';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
import { getAccountDetails } from '@/connectors/account-info';
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

  console.log("accessToken", accessToken)
  // retrieve timezone from SaaS API using the given token
  const timeZone = await getAccountDetails(accessToken);
  console.log("timeZone", timeZone)

  await db.insert(Organisation).values({ id: organisationId, accessToken, refreshToken, region, timeZone }).onConflictDoUpdate({
    target: Organisation.id,
    set: {
      accessToken,
      refreshToken,
      region,
      timeZone
    },
  });

  await inngest.send([
    {
      name: 'hubspot/users.sync.requested',
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
      name: 'hubspot/hubspot.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
    // schedule a new token refresh loop
    {
      name: 'hubspot/hubspot.token.refresh.requested',
      data: {
        organisationId,
        region,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: addMinutes(new Date(), expiresIn - 5).getTime(),
    },
    // this will schedule timezone refresh
    {
      name: 'hubspot/timezone.refresh.requested',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
