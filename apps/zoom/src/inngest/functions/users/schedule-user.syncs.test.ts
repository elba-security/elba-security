import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { scheduleTokenRefresh } from './schedule-token-refresh';

const validInput = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  accessToken: `some_data_access_token${i}`,
  refreshToken: `some_data_refresh_token${i}`,
  expiresIn: new Date(Date.now()),
  region: 'us',
}));

const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  refreshToken: `some_data_refresh_token${i}`,
}));
const now = Date.now();

/* eslint-disable -- no type here */
const setup = createInngestFunctionMock(scheduleTokenRefresh as any);

describe('schedule-token-refresh', () => {
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

  test('should schedule refresh token when there are organisations', async () => {
    await db.insert(Organisation).values(validInput);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations,
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'zoom-refresh-user-token',
      organisations.map(({ id, refreshToken }) => ({
        name: 'zoom/zoom.token.refresh.requested',
        data: {
          organisationId: id,
          isFirstSync: false,
          syncStartedAt: Date.now(),
          refreshToken,
        },
      }))
    );
  });
});
