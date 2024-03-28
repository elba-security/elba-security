import { getHarvestId } from '@/connectors/accounts';
import { getAccessToken, refreshAccessToken } from '@/connectors/auth';
// import { db, Organisation } from '@/database';
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
  const { accessToken, refreshToken, expiresIn } = await getAccessToken(code);
  const harvestId = await getHarvestId(accessToken);
  if (!harvestId) {
    throw new Error('Could not retrieve harvest account id');
  }
  // await db
  //   .insert(Organisation)
  //   .values({
  //     id: organisationId,
  //     accessToken,
  //     refreshToken,
  //     teamId,
  //     region,
  //   })
  //   .onConflictDoUpdate({
  //     target: [Organisation.id],
  //     set: {
  //       id: organisationId,
  //       accessToken,
  //       refreshToken,
  //       teamId,
  //       region,
  //     },
  //   })
  //   .returning();

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
