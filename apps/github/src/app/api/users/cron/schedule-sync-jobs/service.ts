import { getSchedulableInstallationIds } from '@/repositories/integration/installation.repository';
import { insertSyncJobs } from '@/repositories/integration/syncJob.repository';

export const scheduleUsersSyncJobs = async () => {
  const installationIds = await getSchedulableInstallationIds('users');

  if (installationIds.length === 0) {
    return { installationIds: [] };
  }

  await insertSyncJobs(
    installationIds.map((installationId) => ({
      installationId,
      type: 'users',
    }))
  );

  return { installationIds };
};
