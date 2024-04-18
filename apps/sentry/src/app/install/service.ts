import { encrypt } from '@/common/crypto';
import { getUsers } from '../../connectors/users';
import { db } from '../../database/client';
import { Organisation } from '../../database/schema';
import { inngest } from '../../inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  organizationSlug: string;
  token: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  token,
  organizationSlug,
  region,
}: SetupOrganisationParams) => {
  const encryptedToken = await encrypt(token);

  await db
    .insert(Organisation)
    .values({ id: organisationId, region, token: encryptedToken, organizationSlug })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        token: encryptedToken,
        organizationSlug,
      },
    });
  await inngest.send({
    name: 'sentry/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
      cursor: null,
    },
  });
};
