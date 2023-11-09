import { SelectSyncJob } from 'database';
import { deleteSyncJob, updateSyncJob } from 'repositories/integration/syncJob.repository';

export type SyncJobRunner<T> = (job: SelectSyncJob) => Promise<T>;

export const runSyncJobs = async <T>(
  jobs: SelectSyncJob[],
  runner: SyncJobRunner<T>,
  options: { maxRetry: number }
) => {
  const handleFailedSyncJob = async (job: SelectSyncJob) => {
    if (job.retryCount >= options.maxRetry) {
      // TODO: logger
      return await deleteSyncJob(job.installationId, job.type);
    }
    // TODO: logger
    await updateSyncJob(job.installationId, job.type, {
      retryCount: job.retryCount + 1,
    });
  };

  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      try {
        await runner(job);
      } catch (error) {
        // TODO: logger
        await handleFailedSyncJob(job);
        throw error;
      }
    })
  );

  const successfulJobs: SelectSyncJob[] = [];
  const failedJobs: SelectSyncJob[] = [];

  for (let i = 0; i < results.length; i++) {
    const job = jobs[i]!;
    const result = results[i]!;
    if (result.status === 'fulfilled') {
      successfulJobs.push(job);
    } else {
      failedJobs.push(job);
    }
  }

  return {
    successfulJobs,
    failedJobs,
  };
};
