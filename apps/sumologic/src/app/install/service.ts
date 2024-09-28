import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/users';

type SetupOrganisationParams = {
  organisationId: string;
  accessId: string;
  accessKey: string;
  sourceRegion: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  accessId,
  accessKey,
  sourceRegion,
  region,
}: SetupOrganisationParams) => {

  const encodedAccessId = await encrypt(accessId);
  const encodedAccessKey = await encrypt(accessKey);

  await getUsers({accessId, accessKey, sourceRegion})
  
  await db
    .insert(Organisation)
    .values({ id: organisationId, region, accessId: encodedAccessId, accessKey: encodedAccessKey, sourceRegion })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        accessId: encodedAccessId,
        accessKey: encodedAccessKey,
        sourceRegion
      },
    });

  await inngest.send([
    {
      name: 'sumologic/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'sumologic/sumologic.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
