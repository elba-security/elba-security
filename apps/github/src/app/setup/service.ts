import { getInstallation } from '@/connectors/installation';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';

type SetupOrganisationParams = {
  installationId: number;
  organisationId: string;
  region: string;
};

export const setupOrganisation = async ({
  installationId,
  organisationId,
  region,
}: SetupOrganisationParams) => {
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
      region,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
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

  await inngest.send({
    name: 'users/page_sync.requested',
    data: {
      organisationId,
      installationId: installation.id,
      accountLogin: installation.account.login,
      region,
      syncStartedAt: Date.now(),
      isFirstSync: true,
      cursor: null,
    },
  });

  return organisation;
};
