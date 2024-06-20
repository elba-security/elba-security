import { getAccessToken } from '@/connectors/webflow/auth';
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
  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accessToken: encodedAccessToken,
      region,
    })
    .onConflictDoUpdate({
      target: [Organisation.id],
      set: {
        id: organisationId,
        accessToken: encodedAccessToken,
        region,
      },
    });

  await inngest.send({
    name: 'webflow/users.sync.requested',
    data: {
      organisationId,
      syncStartedAt: Date.now(),
      isFirstSync: true
    },
  });
};
