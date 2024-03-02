import { getAccessToken } from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';

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
  const { accessToken, refreshToken } = await getAccessToken(code);
  const [organisation] = await db
    .insert(Organisation)
    .values({ id: organisationId, accessToken, refreshToken, region })
    .onConflictDoUpdate({
      target: [Organisation.id],
      set: {
        id: organisationId,
        accessToken,
        refreshToken,
        region,
      },
    })
    .returning();

  console.log('organisation: ', organisation);
  // await inngest.send({
  //   name: '{SaaS}/users.page_sync.requested',
  //   data: {
  //     isFirstSync: true,
  //     organisationId,
  //     region,
  //     syncStartedAt: Date.now(),
  //     page: null,
  //   },
  // });
};
