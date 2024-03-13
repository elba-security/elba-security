import { getToken } from '@/connectors/microsoft/auth/auth';
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
      name: 'teams/teams.elba_app.installed',
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
      name: 'teams/teams.sync.triggered',
      data: {
        organisationId,
        syncStartedAt: new Date().toISOString(),
        skipToken: null,
      },
    },
    {
      name: 'teams/token.refresh.triggered',
      data: {
        organisationId,
        expiresIn,
      },
    },
    {
      name: 'teams/channels.subscribe.triggered',
      data: {
        organisationId,
      },
    },
  ]);
};
