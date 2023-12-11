import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { scheduleAppsSyncs } from './schedule-apps-syncs';
import { organisations } from './__mocks__/integration';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleAppsSyncs);

describe('schedule-apps-syncs', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule any scans when there are no organisation', async () => {
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({ organisations: [] });

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule scans when there are organisations', async () => {
    await db.insert(Organisation).values(organisations);

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-organisations-apps',
      organisations.map(({ id, installationId, accountLogin }) => ({
        name: 'third-party-apps/page_sync.requested',
        data: {
          installationId,
          organisationId: id,
          accountLogin,
          cursor: null,
          syncStartedAt: Date.now(),
          isFirstSync: false,
        },
      }))
    );
  });
});
