import { encrypt } from '@/common/crypto';
import { getAuthUser, getUsers } from '@/connectors/datadog/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  apiKey: string;
  appKey: string;
  sourceRegion: string;
  region: string;
};
export const registerOrganisation = async ({
  organisationId,
  apiKey,
  appKey,
  sourceRegion,
  region,
}: SetupOrganisationParams) => {
  await getUsers({ apiKey, appKey, sourceRegion, page: 0 });

  const { authUserId } = await getAuthUser({
    apiKey,
    appKey,
    sourceRegion,
  });

  const encodedtoken = await encrypt(apiKey);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, apiKey: encodedtoken, appKey, authUserId, sourceRegion })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        apiKey: encodedtoken,
        appKey,
        authUserId,
        sourceRegion,
      },
    });

  await inngest.send([
    {
      name: 'datadog/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        page: 0,
      },
    },
    {
      name: 'datadog/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
