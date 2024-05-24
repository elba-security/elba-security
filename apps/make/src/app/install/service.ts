import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '../../common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  token: string;
  teamId: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  token,
  teamId,
  region,
}: SetupOrganisationParams) => {
  const encryptedToken = await encrypt(token);
  await db
    .insert(Organisation)
    .values({ id: organisationId, teamId, region, token: encryptedToken })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        token: encryptedToken,
        teamId,
      },
    });

  await inngest.send({
    name: 'make/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
      page: null,
    },
  });
};
