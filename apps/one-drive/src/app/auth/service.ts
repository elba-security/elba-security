import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getToken } from '@/connectors/one-drive/auth';
import { encrypt } from '@/common/crypto';

type SetupOrganisationParams = {
  organisationId: string;
  region: string;
  tenantId: string;
};

export const setupOrganisation = async ({
  organisationId,
  region,
  tenantId,
}: SetupOrganisationParams) => {
  const { token, expiresIn } = await getToken(tenantId);

  const encodedToken = await encrypt(token);
  await db
    .insert(organisationsTable)
    .values({ id: organisationId, tenantId, token: encodedToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        tenantId,
        token: encodedToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'one-drive/one-drive.elba_app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'one-drive/users.sync.triggered',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        skipToken: null,
      },
    },
    {
      name: 'one-drive/token.refresh.triggered',
      data: {
        organisationId,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: subMinutes(addSeconds(new Date(), expiresIn), 5).getTime(),
    },
  ]);
};
