import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { scheduleUsersSyncs } from './schedule-users-sync';

export const organisations = [
  {
    id: '00000000-0000-0000-0000-000000000001',
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
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({
      organisations,
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-organisations-users',
      organisations.map(({ id }) => ({
        name: 'webflow/users.start_sync.requested',
        data: {
          organisationId: id,
          syncStartedAt: now,
          isFirstSync: true,
        },
      }))
    );
  });
});
