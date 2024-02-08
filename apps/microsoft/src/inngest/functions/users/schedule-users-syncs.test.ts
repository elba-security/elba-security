import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { scheduleUsersSyncs } from './schedule-users-syncs';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleUsersSyncs);

export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  tenantId: `tenant-${i}`,
  token: `token-${i}`,
  region: 'us',
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
    await db.insert(organisationsTable).values(organisations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- convenience
      organisations: organisations.map(({ token, ...organisation }) => organisation),
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-organisations-users',
      organisations.map(({ id, tenantId, region }) => ({
        name: 'microsoft/users.sync.triggered',
        data: {
          tenantId,
          organisationId: id,
          region,
          skipToken: null,
          syncStartedAt: now,
          isFirstSync: false,
        },
      }))
    );
  });
});
