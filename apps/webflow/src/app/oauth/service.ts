import { getAccessToken } from '@/connectors/auth';
import { getSiteId } from '@/connectors/sites';
import { getUsers } from '@/connectors/users';
import { db, Organisation } from '@/database';
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
  const accessToken = await getAccessToken(code);
  const siteId = await getSiteId(accessToken);
  if (!siteId) {
    throw new Error('Could not retrieve site id');
  }
  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accessToken,
      siteId,
      region,
    })
    .onConflictDoUpdate({
      target: [Organisation.id],
      set: {
        id: organisationId,
        accessToken,
        siteId,
        region,
      },
    });

  // await inngest.send([
  //   {
  //     name: 'heroku/token.refresh.requested',
  //     data: {
  //       organisationId,
  //       expiresAt: addSeconds(new Date(), expiresIn).getTime(),
  //     },
  //   },
  //   {
  //     name: 'heroku/users.page_sync.requested',
  //     data: {
  //       isFirstSync: true,
  //       organisationId,
  //       region,
  //       syncStartedAt: Date.now(),
  //       range: null,
  //     },
  //   },
  // ]);
};
