import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { scheduleUsersSyncs } from './schedule-users-syncs';

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

export const organisations = [
  {
    id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
    accessToken: await encrypt(newTokens.accessToken),
    refreshToken: await encrypt(newTokens.refreshToken),
    region: 'us',
    workspaceId: 'some-workspace-id',
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
      organisations: organisations.map(({ id }) => ({ id })),
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-users',
      organisations.map(({ id }) => ({
        name: 'bitbucket/users.sync.requested',
        data: {
          organisationId: id,
          syncStartedAt: Date.now(),
          isFirstSync: true,
          page: null,
        },
      }))
    );
  });
});
