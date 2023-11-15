import { getInstallation } from '@/repositories/github/installation';
import { insertInstallation, insertUsersSyncJob } from './data';

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

  await insertUsersSyncJob({
    installationId: installation.id,
    priority: 1,
  });

  return appInstallation;
};
