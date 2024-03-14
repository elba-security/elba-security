import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  token: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  token,
  region,
}: SetupOrganisationParams) => {
  const encodedToken = await encrypt(token);

  await db
    .insert(Organisation)
    .values({ id: organisationId, region, token: encodedToken })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        token: encodedToken,
      },
    });

  await inngest.send([
    {
      name: 'yousign/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    // this will cancel scheduled token refresh if it exists
    {
      name: 'yousign/yousign.elba_app.installed',
      data: {
        organisationId,
        region,
      },
    },
  ]);
};
