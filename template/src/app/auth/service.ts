import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
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
  const encryptedToken = await encrypt(token);

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, token: encryptedToken, region })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        token: encryptedToken,
      },
    });

  await inngest.send({
    name: '{SaaS}/users.page_sync.requested',
    data: {
      isFirstSync: true,
      organisationId,
      region,
      syncStartedAt: Date.now(),
      page: null,
    },
  });
};
