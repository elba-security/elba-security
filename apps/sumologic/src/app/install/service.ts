import { encrypt } from '@/common/crypto';
import { getAuthUser } from '../../connectors/sumologic/users';
import { db } from '../../database/client';
import { organisationsTable } from '../../database/schema';
import { inngest } from '../../inngest/client';

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
  const { authUserId } = await getAuthUser({ accessId, accessKey, sourceRegion });

  const encodedAccessId = await encrypt(accessId);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      accessId: encodedAccessId,
      accessKey,
      sourceRegion,
      authUserId,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        accessId: encodedAccessId,
        accessKey,
        sourceRegion,
        authUserId,
      },
    });

  await inngest.send([
    {
      name: 'sumologic/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'sumologic/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
