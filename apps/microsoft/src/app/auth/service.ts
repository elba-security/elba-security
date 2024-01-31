import { addMinutes } from 'date-fns/addMinutes';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
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
    .insert(Organisation)
    .values({ id: organisationId, tenantId, token: encodedToken, region })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        tenantId,
        token,
        region,
      },
    });

  await inngest.send([
    {
      name: 'microsoft/users.sync_page.triggered',
      data: {
        tenantId,
        organisationId,
        region,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        skipToken: null,
      },
    },
    {
      name: 'microsoft/token.refresh.triggered',
      data: {
        organisationId,
        tenantId,
        region,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: addMinutes(new Date(), expiresIn - 5).getTime(),
    },
  ]);
};
