import { z } from 'zod';
import type { InstallationHandler } from '@elba-security/app-core/nextjs';
import { getInstallation } from '@/connectors/github/installation';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const searchParamsSchema = z.object({
  installationId: z.coerce.number().int().positive(),
});

export const handleInstallation: InstallationHandler<typeof searchParamsSchema> = async ({
  organisationId,
  region,
  searchParams: { installationId },
}) => {
  const installation = await getInstallation(installationId);

  if (installation.account.type !== 'Organization') {
    throw new Error('Cannot install elba github app on an account that is not an organization');
  }

  if (installation.suspended_at) {
    throw new Error('Installation is suspended');
  }

  await db
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
    });

  return {
    tokenExpiresAt: null,
  };
};
