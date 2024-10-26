import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '../../common/crypto';

type SetupOrganisationParams = {
  token: string;
  zoneDomain: string;
  organisationId: string;
  region: string;
};

export const registerOrganisation = async ({
  token,
  zoneDomain,
  organisationId,
  region,
}: SetupOrganisationParams) => {
  const encryptedToken = await encrypt(token);
  await db
    .insert(Organisation)
    .values({ id: organisationId, zoneDomain, region, token: encryptedToken })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        token: encryptedToken,
        zoneDomain,
      },
    });

  await inngest.send([
    {
      name: 'make/users.start_sync.requested',
      data: {
        organisationId,
        syncStartedAt: Date.now(),
        isFirstSync: true
      },
    },
    {
      name: 'make/app.installed',
      data: {
        organisationId,
      },
    },
  ]);
};
