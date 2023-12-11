import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { scheduleUsersSyncs } from './schedule-users-syncs';
import { organisations } from './__mocks__/integration';

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
    await db.insert(Organisation).values(organisations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations,
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-organisations-users',
      organisations.map(({ id, installationId, accountLogin }) => ({
        name: 'users/page_sync.requested',
        data: {
          installationId,
          organisationId: id,
          accountLogin,
          cursor: null,
          syncStartedAt: now,
          isFirstSync: false,
        },
      }))
    );
  });
});
