import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { getToken } from '@/connectors/auth';
import { inngest } from '@/inngest/client';

export const setupOrganisation = async (organisationId: string, code: string) => {
  // retrieve token from SaaS API using the given code
  const token = await getToken(code);

  await db.insert(Organisation).values({ id: organisationId, token }).onConflictDoUpdate({
    target: Organisation.id,
    set: {
      token,
    },
  });

  await inngest.send({
    name: 'users/sync',
    data: {
      isFirstSync: true,
      organisationId,
      syncStartedAt: Date.now(),
      page: null,
    },
  });
};
