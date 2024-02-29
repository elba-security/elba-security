import { addSeconds } from 'date-fns/addSeconds';
import { getToken } from '@/connectors/microsoft/auth';
import { encrypt } from '@/common/crypto';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';

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
    .values({
      id: organisationId,
      tenantId,
      token: encodedToken,
      region,
    })
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
      name: 'teams/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'teams/users.sync.triggered',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        skipToken: null,
      },
    },
    {
      name: 'teams/token.refresh.triggered',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);
};
