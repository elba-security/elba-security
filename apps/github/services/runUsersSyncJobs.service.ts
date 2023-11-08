import { sql } from 'drizzle-orm';
import { type SelectSyncJob } from '../database';
import { env } from '../env';
import { ElbaRepository } from '../repositories/elba/elba.repository';
import { getPaginatedOrganizationMembers } from '../repositories/github/organization.repository';
import {
  getInstallation,
  updateInstallation,
} from '../repositories/integration/installation.repository';
import {
  deleteInstallationAdminsSyncedBefore,
  insertInstallationAdmins,
} from '../repositories/integration/installationAdmin.repository';
import {
  deleteSyncJob,
  getStartedSyncJobs,
  updateSyncJob,
} from '../repositories/integration/syncJob.repository';
import { formatElbaUser } from './common/formatElbaUser';
import { runSyncJobs } from './common/runSyncJobs';

const runUsersSyncJob = async (job: SelectSyncJob) => {
  const syncStartedAt = job.syncStartedAt ?? new Date();
  if (!job.syncStartedAt) {
    await updateSyncJob(job.installationId, 'users', { syncStartedAt });
  }

  const installation = await getInstallation(job.installationId);

  const { nextCursor, validMembers, invalidMembers } = await getPaginatedOrganizationMembers(
    job.installationId,
    installation.accountLogin,
    job.cursor
  );

  if (invalidMembers.length > 0) {
    // TODO: logger
  }

  const installationAdmins = validMembers
    .filter((member) => member.role === 'ADMIN')
    .map((member) => ({
      installationId: job.installationId,
      adminId: member.id,
      lastSyncAt: syncStartedAt,
    }));

  if (installationAdmins.length > 0) {
    await insertInstallationAdmins(installationAdmins, syncStartedAt);
  }

  const elbaRepository = new ElbaRepository(installation.elbaOrganizationId);

  const elbaUsers = validMembers.map(formatElbaUser);
  await elbaRepository.users.updateUsers(elbaUsers);

  if (nextCursor) {
    return await updateSyncJob(job.installationId, 'users', {
      cursor: nextCursor,
    });
  }

  await Promise.all([
    elbaRepository.users.deleteUsers(syncStartedAt),
    deleteInstallationAdminsSyncedBefore(job.installationId, syncStartedAt),
    deleteSyncJob(job.installationId, 'users'),
    updateInstallation(job.installationId, { usersLastSyncedAt: sql`now()` }),
  ]);
};

export const runUsersSyncJobs = async () => {
  const jobs = await getStartedSyncJobs('users');

  if (jobs.length === 0) {
    return { message: "Their is no syncJobs with type='users' to run." };
  }

  return await runSyncJobs(jobs, runUsersSyncJob, { maxRetry: env.USERS_SYNC_MAX_RETRY });
};
