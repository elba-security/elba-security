import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { scheduleUsersSynchronize } from './schedule-users-synchronize';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleUsersSynchronize);

const encodedAccessToken = await encrypt('test-access-token');
const encodedRefreshToken = await encrypt('test-refresh-token');

export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `b91f113b-bcf9-4a28-98c7-5b13fb671c1${i}`,
  region: 'us',
  accessToken: encodedAccessToken,
  refreshToken: encodedRefreshToken,
  apiDomain: `test-url${i}`,
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
      organisations: organisations.map(
        ({ accessToken, refreshToken, apiDomain, ...organisation }) => organisation
      ),
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'synchronize-users',
      organisations.map(({ id, region }) => ({
        name: 'pipedrive/users.sync.requested',
        data: {
          organisationId: id,
          region,
          syncStartedAt: now,
          isFirstSync: false,
          page: null,
        },
      }))
    );
  });
});
