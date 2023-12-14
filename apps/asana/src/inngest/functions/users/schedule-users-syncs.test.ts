import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { scheduleUsersSyncs } from './schedule-users-syncs';

const validInput = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  name: `some_data_name${i}`,
  email: `some_data_email${i}`,
  accessToken: `some_data_access_token${i}`,
  refreshToken: `some_data_refresh_token${i}`,
  expiresAt: new Date(Date.now()),
  asanaId: `some_data_asana_id${i}`,
  gid: `some_data_gid${i}`,
  webhookSecret: `some_data_webhook_secret${i}`,
}));

const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
}));
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
      await db.insert(Organisation).values(validInput);
      const [result, { step }] = setup();

      await expect(result).resolves.toStrictEqual({
        organisations,
      });
      expect(step.sendEvent).toBeCalledTimes(1);
      expect(step.sendEvent).toBeCalledWith(
        'sync-users',
        organisations.map(({ id }) => ({
          name: 'users/sync',
          data: {
            isFirstSync: false,
            organisationId: id,
            syncStartedAt: Date.now(),
            page: null,
          },
        }))
      );
    });

  });