import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { scheduleUsersSyncs } from './schedule-users-syncs';

export const organisations = [
  {
    id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
    accessToken: 'access-token',
    region: 'us',
  },
];

const now = Date.now();

const setup = createInngestFunctionMock(scheduleUsersSyncs);

describe('schedule-users-syncs', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule any jobs when there are no organisations', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are organisations', async () => {
    await db.insert(Organisation).values(organisations)
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({
      organisations,
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-organisations-users',
      organisations.map(({ id, region }) => ({
        name: 'clickup/users.start_sync.requested',
        data: {
          organisationId: id,
          syncStartedAt: Date.now(),
          isFirstSync: true
        },
      }))
    );
  });
});
