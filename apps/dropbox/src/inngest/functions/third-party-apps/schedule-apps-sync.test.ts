import { expect, test, describe, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import type { Organisation } from '@/database/schema';
import { organisationsTable } from '@/database/schema';
import { scheduleAppsSync } from './schedule-apps-sync';

const now = new Date('2021-01-01T00:00:00.000Z').getTime();

const setup = createInngestFunctionMock(scheduleAppsSync);

export const organisations: Omit<Organisation, 'createdAt'>[] = Array.from(
  { length: 5 },
  (_, i) => ({
    id: `00000000-0000-0000-0000-00000000000${i}`,
    accessToken: `test-access-token-${i}`,
    refreshToken: `test-refresh-token-${i}`,
    adminTeamMemberId: `admin-team-member-id-${i}`,
    rootNamespaceId: `root-namespace-id-${i}`,
    region: `us`,
  })
);

describe('scheduleAppSync', () => {
  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule any jobs when there are no organisations', async () => {
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule third party apps sync jobs for available organisations', async () => {
    vi.setSystemTime(now);
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: organisations.map(({ id }) => ({ id })),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-apps',
      organisations.map(({ id: organisationId }) => ({
        name: 'dropbox/third_party_apps.sync.requested',
        data: {
          organisationId,
          isFirstSync: false,
          syncStartedAt: 1609459200000,
          cursor: null,
        },
      }))
    );
  });
});
