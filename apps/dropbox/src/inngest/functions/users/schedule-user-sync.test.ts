import { expect, test, describe, vi } from 'vitest';
import { scheduleUserSync } from './schedule-user-sync';
import { insertOrganisations } from '@/test-utils/token';
import { scheduledOrganisations } from './__mocks__/organisations';
import { createInngestFunctionMock } from '@elba-security/test-utils';

const setup = createInngestFunctionMock(scheduleUserSync);

describe('scheduleUserSync', () => {
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
          organisationId: '00000000-0000-0000-0000-000000000001',
        },
        {
          organisationId: '00000000-0000-0000-0000-000000000002',
        },
        {
          organisationId: '00000000-0000-0000-0000-000000000003',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'dropbox-sync-user-page',
      scheduledOrganisations.map((organisation) => ({
        name: 'dropbox/users.sync_page.triggered',
        data: { ...organisation, isFirstSync: false, syncStartedAt: 1609459200000 },
      }))
    );
  });
});
