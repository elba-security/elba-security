import { getInstallation } from '@/repositories/github/installation.repository';
import { insertInstallation } from '@/repositories/integration/installation.repository';
import { insertSyncJob } from '@/repositories/integration/syncJob.repository';

export const setupInstallation = async (installationId: number, elbaOrganizationId: string) => {
  const installation = await getInstallation(installationId);

  if (installation.account.type !== 'Organization') {
    throw new Error('Cannot install elba github app on a personnal account.');
  }

  if (installation.suspended_at) {
    throw new Error('Installation is suspended');
  }

  const appInstallation = await insertInstallation({
    id: installation.id,
    accountId: installation.account.id,
    accountLogin: installation.account.login,
    elbaOrganizationId,
  });

  await insertSyncJob({
    installationId: installation.id,
    status: 'started',
    type: 'users',
  });

  return appInstallation;
};
