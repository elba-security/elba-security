import { expect, test, describe, vi, afterAll } from 'vitest';
import { scheduleThirdPartyAppsSyncJobs } from './schedule-sync-jobs';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { insertOrganisations } from '@/test-utils/token';

const setup = createInngestFunctionMock(scheduleThirdPartyAppsSyncJobs);

const selectedOrganisations = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
];

describe('schedule-third-party-apps-sync-jobs', () => {
  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule any jobs when there are no organisations', async () => {
    const [result, { step }] = await setup();

    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule third party apps sync jobs for available organisations', async () => {
    await insertOrganisations({
      size: 3,
    });
    vi.setSystemTime('2023-01-13T22:02:52.744Z');
    const [result, { step }] = await setup();

    await expect(result).resolves.toStrictEqual({
      organisations: selectedOrganisations.map((organisationId) => ({
        organisationId,
      })),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'run-third-party-apps-sync-jobs',
      selectedOrganisations.map((organisationId) => ({
        name: 'third-party-apps/run-sync-jobs',
        data: {
          organisationId,
          isFirstSync: false,
          syncStartedAt: '2023-01-13T22:02:52.744Z',
        },
      }))
    );
  });
});
