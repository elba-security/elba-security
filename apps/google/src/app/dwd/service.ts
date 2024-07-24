import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const isInstallationCompleted = async ({
  organisationId,
  region,
  googleAdminEmail,
  googleCustomerId,
}: {
  organisationId: string;
  region: string;
  googleAdminEmail: string;
  googleCustomerId: string;
}) => {
  const authClient = await getGoogleServiceAccountClient(googleAdminEmail);

  try {
    await authClient.authorize();
  } catch {
    return false;
  }

  await db
    .insert(organisationsTable)
    .values({ id: organisationId, region, googleAdminEmail, googleCustomerId })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        googleCustomerId,
        googleAdminEmail,
      },
    });

  await inngest.send([
    {
      name: 'google/common.organisation.inserted',
      data: { organisationId },
    },
    {
      name: 'google/users.sync.requested',
      data: {
        isFirstSync: true,
        organisationId,
        syncStartedAt: new Date().toISOString(),
        pageToken: null,
      },
    },
  ]);

  return true;
};
