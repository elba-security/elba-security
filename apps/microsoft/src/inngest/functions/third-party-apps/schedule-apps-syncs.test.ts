import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { scheduleAppsSyncs } from './schedule-apps-syncs';

const now = Date.now();

const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  tenantId: `tenant-${i}`,
  region: 'us',
  token: 'some-token',
}));

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
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: organisations.map(({ id }) => ({ id })),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'request-apps-syncs',
      organisations.map(({ id }) => ({
        name: 'microsoft/third_party_apps.sync.requested',
        data: {
          organisationId: id,
          skipToken: null,
          syncStartedAt: Date.now(),
          isFirstSync: false,
        },
      }))
    );
  });
});
