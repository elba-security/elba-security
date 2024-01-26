import { addSeconds, subMinutes } from 'date-fns';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getAccessToken, getCloudId } from '@/connectors/jira/auth';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  accessCode: string;
};

export const setupOrganisation = async ({
  organisationId,
  region,
  accessCode,
}: SetupOrganisationParams) => {
  // Exchange the authorization code for an access token
  const { refreshToken, accessToken, expiresIn } = await getAccessToken(accessCode);
  const { cloudId } = await getCloudId(accessToken);

  // Store the token data in the database
  const [organisation] = await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      refreshToken,
      accessToken,
      cloudId,
    })
    .onConflictDoUpdate({
      target: [organisationsTable.id],
      set: {
        accessToken,
        refreshToken,
      },
    })
    .returning();

  if (!organisation) {
    throw new Error(`Could not setup organisation with id=${organisationId}`);
  }

  await inngest.send([
    {
      name: 'jira/jira.elba_app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'jira/token.refresh.triggered',
      data: {
        organisationId,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: subMinutes(addSeconds(new Date(), expiresIn), 5).getTime(),
    },
  ]);
};
