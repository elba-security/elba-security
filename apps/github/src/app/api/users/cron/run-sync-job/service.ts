/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { RequestError } from '@octokit/request-error';
import type { User } from '@/repositories/elba/resources/users/types';
import {
  getPaginatedOrganizationMembers,
  type OrganizationMember,
} from '@/repositories/github/organization';
import { env } from '@/common/env';
import { ElbaRepository } from '@/repositories/elba/elba.repository';
import {
  updateUsersSyncJobRetryCount,
  updateUsersSyncJobCursor,
  getUsersSyncJobWithInstallation,
  deleteUsersSyncJob,
  insertInstallationAdmins,
  deleteInstallationAdminsSyncedBefore,
  type UsersSyncJobWithInstallation,
  updateUsersSyncJobRetryAfter,
} from './data';

const formatElbaUser = (member: OrganizationMember): User => ({
  id: String(member.id),
  email: member.email ?? undefined,
  displayName: member.name ?? member.login,
  additionalEmails: [],
});

const runUsersSyncJob = async (job: UsersSyncJobWithInstallation) => {
  const elba = new ElbaRepository(job.installation.elbaOrganizationId);
  let cursor = job.cursor;

  do {
    // TODO: add log for invalidMembers
    const { nextCursor, validMembers } = await getPaginatedOrganizationMembers(
      job.installationId,
      job.installation.accountLogin,
      job.cursor
    );

    cursor = nextCursor;

    const installationAdmins = validMembers
      .filter((member) => member.role === 'ADMIN')
      .map((member) => ({
        installationId: job.installationId,
        adminId: member.id,
        lastSyncAt: job.syncStartedAt,
      }));

    if (installationAdmins.length > 0) {
      await insertInstallationAdmins(installationAdmins, job.syncStartedAt);
    }

    if (validMembers.length > 0) {
      await elba.users.updateUsers(validMembers.map(formatElbaUser));
    }

    if (cursor) {
      await updateUsersSyncJobCursor(job.installationId, cursor);
    }
  } while (cursor);

  await elba.users.deleteUsers(job.syncStartedAt);
  await deleteInstallationAdminsSyncedBefore(job.installationId, job.syncStartedAt);
  await deleteUsersSyncJob(job.installationId);
};

export const runUsersSyncJobs = async () => {
  const job = await getUsersSyncJobWithInstallation();

  if (!job) {
    return {
      message: 'There is no users_sync_job to run',
    };
  }

  try {
    await runUsersSyncJob(job);
    return { success: true, id: job.installationId };
  } catch (error) {
    if (
      error instanceof RequestError &&
      error.response?.headers['x-ratelimit-remaining'] === '0' &&
      error.response.headers['x-ratelimit-reset']
    ) {
      const retryAfter = new Date(Number(error.response.headers['x-ratelimit-reset']) * 1000);
      await updateUsersSyncJobRetryAfter(job.installationId, retryAfter);
    } else if (job.retryCount < env.USERS_SYNC_MAX_RETRY) {
      await updateUsersSyncJobRetryCount(job.installationId, job.retryCount + 1);
    } else {
      await deleteUsersSyncJob(job.installationId);
    }
    return { success: false, id: job.installationId };
  }
};
