import { expect, test, describe } from 'vitest';
import { scheduleUserSyncJobs } from './schedule-user-sync-jobs';
import { mockInngestFunction } from '@/common/__mocks__/inngest';
import { insertOrganisations } from '@/common/__mocks__/token';
import { scheduledOrganisations } from './__mocks__/organisations';

describe('schedule-users-sync-jobs', () => {
  test('should not schedule any jobs when there are no organisations', async () => {
    const { result, step } = mockInngestFunction(scheduleUserSyncJobs);
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are organisations to schedule', async () => {
    await insertOrganisations({
      size: 3,
    });

    const { result, step } = mockInngestFunction(scheduleUserSyncJobs);

    await expect(result).resolves.toStrictEqual({
      organisations: expect.arrayContaining(scheduledOrganisations),
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'run-users-sync-scan',
      expect.arrayContaining(
        scheduledOrganisations.map((organisation) => ({
          name: 'users/run-user-sync-jobs',
          data: { ...organisation, isFirstScan: false },
        }))
      )
    );
  });
});
