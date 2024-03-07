import { addSeconds } from 'date-fns';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';

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
  // retrieve token from SaaS API using the given code
  const token = await getToken(code);

  const accessToken = await encrypt(token.access_token);
  const refreshToken = await encrypt(token.refresh_token);

  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      accessToken,
      refreshToken,
      region,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        accessToken,
        refreshToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'smart-sheet/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        region,
        syncStartedAt: Date.now(),
        page: 1,
      },
    },
    {
      name: 'smart-sheet/smart-sheet.token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), token.expires_in).getTime(),
      },
    },
  ]);
};
