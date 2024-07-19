import { addSeconds } from 'date-fns/addSeconds';
import { getToken } from '@/connectors/microsoft/auth/auth';
import { encrypt } from '@/common/crypto';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/microsoft/user/users';

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

  try {
    // we test the installation: microsoft API takes time to propagate it through its services
    await getUsers({ token, tenantId, skipToken: null });
  } catch {
    return { isAppInstallationCompleted: false };
  }

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
      name: 'teams/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        skipToken: null,
      },
    },
    {
      name: 'teams/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);

  return { isAppInstallationCompleted: true };
};
