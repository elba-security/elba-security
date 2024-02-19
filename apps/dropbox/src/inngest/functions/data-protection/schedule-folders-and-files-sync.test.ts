import { createInngestFunctionMock } from '@elba-security/test-utils';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { scheduleDataProtectionSyncJobs } from './schedule-folders-and-files-sync';
import { insertOrganisations } from '@/test-utils/token';

const setup = createInngestFunctionMock(scheduleDataProtectionSyncJobs);

describe('scheduleDataProtectionSyncJobs', () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date('2024-01-20T10:00:00.007Z'));
    vi.clearAllMocks();
  });

  test('should not schedule any jobs when there are no organisations to refresh', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule sync jobs for the available organisations', async () => {
    await insertOrganisations();

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: [
        {
          organisationId: '00000000-0000-0000-0000-000000000001',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('start-shared-link-sync', [
      {
        data: {
          isFirstSync: false,
          organisationId: '00000000-0000-0000-0000-000000000001',
          syncStartedAt: 1705744800007,
        },
        name: 'dropbox/data_protection.shared_link.start.sync_page.requested',
      },
    ]);
  });
});
