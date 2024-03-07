import type { InstallationHandler } from '@elba-security/nextjs';
import { z } from 'zod';
import { getInstallation } from '@/connectors/github/installation';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const searchParamsSchema = z.object({
  installation_id: z.coerce.number().int().positive(),
});

export const handleInstallation: InstallationHandler<typeof searchParamsSchema> = async ({
  organisationId,
  region,
  searchParams: { installation_id: installationId },
}) => {
  const installation = await getInstallation(installationId);

  if (installation.account.type !== 'Organization') {
    throw new Error('Cannot install elba github app on an account that is not an organization');
  }

  if (installation.suspended_at) {
    throw new Error('Installation is suspended');
  }

  const [organisation] = await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      installationId: installation.id,
      accountLogin: installation.account.login,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        installationId: installation.id,
        accountLogin: installation.account.login,
        region,
      },
    })
    .returning();

  if (!organisation) {
    throw new Error(`Could not setup organisation with id=${organisationId}`);
  }

  await inngest.send([
    {
      name: 'github/github.elba_app.installed',
      data: {
        organisationId,
      },
    },
    {
      name: 'github/users.page_sync.requested',
      data: {
        organisationId,
        installationId: installation.id,
        accountLogin: installation.account.login,
        region,
        syncStartedAt: Date.now(),
        isFirstSync: true,
        cursor: null,
      },
    },
  ]);
};
