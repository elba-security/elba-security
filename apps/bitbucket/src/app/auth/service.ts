import { addSeconds, subMinutes } from 'date-fns';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getAccessToken } from '@/connectors/auth';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  accessCode: string;
};

export const setupOrganisation = async ({
  organisationId,
  accessCode,
  region,
}: SetupOrganisationParams) => {
  // Exchange the authorization code for an access token
  const { refreshToken, accessToken, expiresIn } = await getAccessToken(accessCode);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, accessToken, refreshToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken,
        refreshToken,
      },
    });

  await inngest.send([
    {
      name: 'bitbucket/bitbucket.elba_app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'bitbucket/token.refresh.triggered',
      data: {
        organisationId,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: subMinutes(addSeconds(new Date(), expiresIn), 5).getTime(),
    },
  ]);
};
