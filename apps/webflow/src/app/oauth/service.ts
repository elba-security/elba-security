import { getAccessToken } from '@/connectors/webflow/auth';
import { getSiteIds } from '@/connectors/webflow/sites';
import { db, Organisation } from '@/database';
import { inngest } from '@/inngest/client';
import { encrypt  } from '@/common/crypto';


type SetupOrganisationParams = {
  organisationId: string;
  code: string;
  region: string;
};

export const setupOrganisation = async ({
  organisationId,
  code,
  region,
}: SetupOrganisationParams) => {
  const accessToken = await getAccessToken(code);
  const encodedAccessToken = await encrypt(accessToken);
  const siteIds = await getSiteIds(accessToken);
  if (siteIds.length === 0) {
    throw new Error('No sites found for the organisation');
  }
  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      siteIds,
      region,
    })
    .onConflictDoUpdate({
      target: [Organisation.id],
      set: {
        id: organisationId,
        accessToken: encodedAccessToken,
        siteIds,
        region,
      },
    });

  await inngest.send({
    name: 'webflow/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
      page: 0,
    },
  });
};
