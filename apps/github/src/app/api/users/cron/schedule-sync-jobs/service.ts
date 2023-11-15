import { getSchedulableInstallationIds, insertUsersSyncJobs } from './data';

export const scheduleUsersSyncJobs = async () => {
  const installationIds = await getSchedulableInstallationIds();

  if (installationIds.length === 0) {
    return { installationIds: [] };
  }

  await insertUsersSyncJobs(
    installationIds.map((installationId) => ({
      installationId,
      priority: 2,
    }))
  );

  return { installationIds };
};
