import { getInstallation } from '@/connectors/installation';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';

export const setupOrganisation = async (installationId: number, organisationId: string) => {
  const installation = await getInstallation(installationId);

  if (installation.account.type !== 'Organization') {
    throw new Error('Cannot install elba github app on an account that is not an organization');
  }

  if (installation.suspended_at) {
    throw new Error('Installation is suspended');
  }

  const [organisation] = await db
    .insert(Organisation)
    .values({
      id: organisationId,
      installationId: installation.id,
      accountLogin: installation.account.login,
    })
    .returning();

  if (!organisation) {
    throw new Error(`Could not setup organisation with id=${organisationId}`);
  }

  await inngest.send({
    name: 'users/page_sync.requested',
    data: {
      organisationId,
      installationId: installation.id,
      accountLogin: installation.account.login,
      syncStartedAt: Date.now(),
      isFirstSync: true,
      cursor: null,
    },
  });

  return organisation;
};
