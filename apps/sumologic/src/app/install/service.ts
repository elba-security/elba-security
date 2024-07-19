import { encrypt } from '@/common/crypto';
import { getOwnerId } from '../../connectors/sumologic/users';
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
  const { ownerId } = await getOwnerId({ accessId, accessKey, sourceRegion });

  const encodedAccessId = await encrypt(accessId);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
      accessId: encodedAccessId,
      accessKey,
      sourceRegion,
      ownerId,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        region,
        accessId: encodedAccessId,
        accessKey,
        sourceRegion,
        ownerId,
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
