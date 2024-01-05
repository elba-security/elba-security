import { expect, test, describe, vi } from 'vitest';
import { scheduleThirdPartyAppsSyncJobs } from './schedule-sync-jobs';
import { insertOrganisations } from '@/common/__mocks__/token';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { beforeEach } from 'node:test';

const organisationId = '00000000-0000-0000-0000-000000000001';

export const scheduledOrganisations = [
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
];

const setup = createInngestFunctionMock(
  scheduleThirdPartyAppsSyncJobs,
  'third-party-apps/run-sync-jobs'
);

describe('schedule-third-party-apps-sync-jobs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should not schedule any jobs when there are no organisations', async () => {
    const [result, { step }] = await setup({
      accessToken: 'access-token-1',
      organisationId,
      isFirstScan: false,
      syncStartedAt: '2023-01-04T22:02:52.744Z',
    });

    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule third party apps jobs when there are organisations to schedule', async () => {
    vi.setSystemTime('2023-01-04T22:02:52.744Z');
    await insertOrganisations({
      size: 3,
    });

    const [result, { step }] = await setup({
      accessToken: 'access-token-1',
      organisationId,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toStrictEqual({
      organisations: expect.arrayContaining(scheduledOrganisations),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'run-third-party-apps-sync-jobs',
      expect.arrayContaining(
        scheduledOrganisations.map((organisation) => ({
          name: 'third-party-apps/run-sync-jobs',
          data: { ...organisation, isFirstScan: false, syncStartedAt: '2023-01-04T22:02:52.744Z' },
        }))
      )
    );
  });
});
