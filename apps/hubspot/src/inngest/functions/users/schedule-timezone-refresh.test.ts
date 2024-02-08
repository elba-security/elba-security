import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { scheduleTimeZoneRefresh } from './schedule-timezone-refresh';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleTimeZoneRefresh);

export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `b91f113b-bcf9-4a28-98c7-5b13fb671c1${i}`,
  region: 'us',
  accessToken: `some access-token${i}`,
  refreshToken: `some refresh-token${i}`,
  timeZone:'us/eastern',
}));

describe('schedule-timezone-refresh', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule any timezone refresh when there are no organisations', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule timezone refresh when there are organisations', async () => {
    await db.insert(Organisation).values(organisations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- convenience
      organisations: organisations.map(({ accessToken, refreshToken, timeZone, ...organisation }) => organisation),
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'refresh-timezone',
      organisations.map(({ id, region }) => ({
        name: 'hubspot/timezone.refresh.requested',
        data: {
          organisationId: id,
          region,
        },
      }))
    );
  });
});