import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { scheduleUsersSyncs } from './schedule-user-sync';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleUsersSyncs);

export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `b91f113b-bcf9-4a28-98c7-5b13fb671c1${i}`,
  region: 'us',
  apiKey: `some api-key-${i}`,
  appKey: `some app-key-${i}`,
}));

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
      organisations: organisations.map(({ id, region }) => ({ id, region })),
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-users-page',
      organisations.map(({ id }) => ({
        name: 'datadog/users.page_sync.requested',
        data: {
          organisationId: id,
          syncStartedAt: now,
          isFirstSync: false,
          region: 'us',
        },
      }))
    );
  });
});
