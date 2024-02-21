import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/gitlab/auth';
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
  const result = await getToken(code);

  const accessToken = await encrypt(result.accessToken);
  const refreshToken = await encrypt(result.refreshToken);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, accessToken, refreshToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        accessToken,
        refreshToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'gitlab/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'gitlab/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'gitlab/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), result.expiresIn).getTime(),
      },
    },
  ]);
};
