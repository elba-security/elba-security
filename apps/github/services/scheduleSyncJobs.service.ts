import { SyncJobType } from '../database';
import { getSchedulableInstallationIds } from '../repositories/integration/installation.repository';
import { insertSyncJobs } from '../repositories/integration/syncJob.repository';

export const scheduleSyncJobs = async (type: SyncJobType) => {
  const installationIds = await getSchedulableInstallationIds(type);

  if (installationIds.length === 0) {
    return { installationIds: [] };
  }

  await insertSyncJobs(
    installationIds.map((installationId) => ({
      installationId,
      type,
    }))
  );

  return { installationIds };
};
