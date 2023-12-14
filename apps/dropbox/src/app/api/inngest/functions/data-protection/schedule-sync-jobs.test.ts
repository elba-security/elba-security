import { expect, test, describe, beforeAll, vi } from 'vitest';
import { scheduleDataProtectionSyncJobs } from './schedule-sync-jobs';
import { insertOrganisations } from '@/common/__mocks__/token';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { scheduledOrganisations } from './__mocks__/organisations';

const setup = createInngestFunctionMock(scheduleDataProtectionSyncJobs);

describe('scheduleDataProtectionSyncJobs', () => {
  beforeAll(() => {
    vi.setSystemTime('2023-01-14T20:00:00.000Z');
  });

  test('should not schedule any jobs when there are no organisations to refresh', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule sync jobs for the available organisations', async () => {
    await insertOrganisations({
      size: 3,
      expiresAt: [
        new Date('2023-01-10T20:00:00.000Z'), // Expired token
        new Date('2023-01-14T20:00:00.000Z'),
        new Date('2023-01-14T20:00:00.000Z'),
      ],
    });

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: expect.arrayContaining([
        {
          accessToken: 'access-token-1',
          organisationId: 'ce47f296-6d45-4405-ad2b-e279bec52621',
          pathRoot: 'root-namespace-id',
        },
        {
          accessToken: 'access-token-2',
          organisationId: 'ce47f296-6d45-4405-ad2b-e279bec52622',
          pathRoot: 'root-namespace-id',
        },
      ]),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'send-event-create-shared-link-sync-jobs',
      expect.arrayContaining([
        {
          name: 'data-protection/create-shared-link-sync-jobs',
          data: {
            accessToken: 'access-token-1',
            organisationId: 'ce47f296-6d45-4405-ad2b-e279bec52621',
            pathRoot: 'root-namespace-id',
            syncStartedAt: '2023-01-14T20:00:00.000Z',
            isFirstScan: false,
          },
        },
        {
          name: 'data-protection/create-shared-link-sync-jobs',
          data: {
            accessToken: 'access-token-2',
            organisationId: 'ce47f296-6d45-4405-ad2b-e279bec52622',
            pathRoot: 'root-namespace-id',
            syncStartedAt: '2023-01-14T20:00:00.000Z',
            isFirstScan: false,
          },
        },
      ])
    );
  });
});
