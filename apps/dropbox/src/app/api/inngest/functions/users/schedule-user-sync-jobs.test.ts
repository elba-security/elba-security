import { expect, test, describe, vi } from 'vitest';
import { scheduleUserSyncJobs } from './schedule-user-sync-jobs';
import { insertOrganisations } from '@/common/__mocks__/token';
import { scheduledOrganisations } from './__mocks__/organisations';
import { createInngestFunctionMock } from '@elba-security/test-utils';

const setup = createInngestFunctionMock(scheduleUserSyncJobs);

describe('schedule-users-sync-jobs', () => {
  test('should not schedule any jobs when there are no organisations', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are organisations to schedule', async () => {
    vi.setSystemTime('2021-01-01T00:00:00.000Z');
    await insertOrganisations({
      size: 3,
    });

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: [
        {
          accessToken: 'access-token-1',
          organisationId: '00000000-0000-0000-0000-000000000001',
        },
        {
          accessToken: 'access-token-2',
          organisationId: '00000000-0000-0000-0000-000000000002',
        },
        {
          accessToken: 'access-token-3',
          organisationId: '00000000-0000-0000-0000-000000000003',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'run-user-sync-jobs',
      scheduledOrganisations.map((organisation) => ({
        name: 'users/run-user-sync-jobs',
        data: { ...organisation, isFirstScan: false, syncStartedAt: '2021-01-01T00:00:00.000Z' },
      }))
    );
  });
});
