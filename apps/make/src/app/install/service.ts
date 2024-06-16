import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getOrganizationIds } from '@/connectors/make/organizations';
import { encrypt } from '../../common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  token: string;
  zoneDomain: string;
  region: string;
};

export const registerOrganisation = async ({
  organisationId,
  token,
  zoneDomain,
  region,
}: SetupOrganisationParams) => {
  const organizationIds = await getOrganizationIds(token, zoneDomain);
  if (organizationIds.length === 0) {
    throw new Error('No organizations found');
  }
  const encryptedToken = await encrypt(token);
  await db
    .insert(Organisation)
    .values({ id: organisationId, organizationIds, zoneDomain, region, token: encryptedToken })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        region,
        token: encryptedToken,
        organizationIds,
        zoneDomain,
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
