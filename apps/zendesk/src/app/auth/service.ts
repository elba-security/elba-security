import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/zendesk/auth';
import { getAuthUser, getOwnerId } from '@/connectors/zendesk/users';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
  subDomain: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
  subDomain,
}: SetupOrganisationParams) => {
  const { accessToken } = await getToken({ code, subDomain });
  const { authUserId } = await getAuthUser({ accessToken, subDomain });
  const { ownerId } = await getOwnerId({ accessToken, subDomain });
  const encryptedAccessToken = await encrypt(accessToken);

  // TODO: @Guillaume
  // We can verify the access token to ensure it is valid, if necessary
  // https://developer.zendesk.com/documentation/integration-services/zis-tutorials/zendesk-app-admin-interface/app-oauth/#verify-the-zendesk-access-token

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      accessToken: encryptedAccessToken,
      region,
      subDomain,
      ownerId,
      authUserId,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken: encryptedAccessToken,
        region,
        subDomain,
        ownerId,
        authUserId,
      },
    });

  await inngest.send([
    {
      name: 'zendesk/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'zendesk/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
