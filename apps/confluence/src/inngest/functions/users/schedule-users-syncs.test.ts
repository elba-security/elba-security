import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { scheduleUsersSyncs } from './schedule-users-syncs';

const now = Date.now();

const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  region: 'us',
  instanceId: '1234',
  instanceUrl: 'http://foo.bar/',
  accessToken: 'test-access-token',
  refreshToken: 'test-access-token',
}));

const setup = createInngestFunctionMock(scheduleUsersSyncs);

describe('schedule-users-syncs', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule any syncs when there are no organisation', async () => {
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({ organisations: [] });

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule syncs when there are organisations', async () => {
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: organisations.map(({ id }) => ({ id })),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'request-users-syncs',
      organisations.map(({ id }) => ({
        name: 'confluence/users.sync.requested',
        data: {
          organisationId: id,
          isFirstSync: false,
          syncStartedAt: Date.now(),
          cursor: null,
        },
      }))
    );
  });
});
