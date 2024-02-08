import { addMinutes } from 'date-fns/addMinutes';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getToken } from '@/connectors/microsoft/auth';
import { inngest } from '@/inngest/client';
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
      name: 'microsoft/users.sync.triggered',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        skipToken: null,
      },
    },
    {
      name: 'microsoft/microsoft.elba_app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'microsoft/token.refresh.triggered',
      data: {
        organisationId,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: addMinutes(new Date(), expiresIn - 5).getTime(),
    },
  ]);
};
