import { addSeconds } from 'date-fns/addSeconds';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getToken } from '@/connectors/microsoft/auth/tokens';
import { encrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/microsoft/users/users';

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
    // we test the installaton: microsoft API takes time to propagate it through its services
    await getUsers({ token, tenantId, skipToken: null });
  } catch {
    return { isAppInstallationCompleted: false };
  }

  const encryptedToken = await encrypt(token);
  await db
    .insert(organisationsTable)
    .values({ id: organisationId, tenantId, token: encryptedToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        tenantId,
        token: encryptedToken,
        region,
      },
    });

  await inngest.send([
    {
      name: 'onedrive/app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'onedrive/users.sync.triggered',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        skipToken: null,
      },
    },
    {
      name: 'onedrive/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), expiresIn).getTime(),
      },
    },
  ]);

  return { isAppInstallationCompleted: true };
};
