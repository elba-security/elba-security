import { createInngestFunctionMock } from '@elba-security/test-utils';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { scheduleThirdPartyAppsSync } from './schedule-sync';

const mockFunction = createInngestFunctionMock(scheduleThirdPartyAppsSync);

const now = new Date('2025-06-03T08:47:51.421Z');

const organisations = Array.from({ length: 10 }, (_, i) => ({
  id: `fc2b17b9-72c3-4dbe-86de-4bba05b1bbc${i}`,
  region: i % 2 === 0 ? 'eu' : 'us',
  lastSyncStartedAt: new Date('2025-06-03T08:46:39.000Z'),
  tenantId: 'tenant-id',
  token: 'token',
}));

describe('schedule-third-party-apps-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  test('should trigger sync for every organisations', async () => {
    await db.insert(organisationsTable).values(organisations);
    const [result, { step }] = mockFunction();

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(
      'start-third-party-apps-sync',
      organisations.map((organisation) => ({
        name: 'outlook/third_party_apps.sync.requested',
        data: {
          organisationId: organisation.id,
          region: organisation.region as 'eu' | 'us',
          syncStartedAt: now.toISOString(),
          lastSyncStartedAt: organisation.lastSyncStartedAt,
          pageToken: null,
          tenantId: organisation.tenantId,
          token: organisation.token,
        },
      }))
    );
  });

  test('should return every organisationIds', async () => {
    await db.insert(organisationsTable).values(organisations);
    const [result] = mockFunction();

    await expect(result).resolves.toMatchObject({
      organisationIds: organisations.map(({ id }) => id),
    });
  });
});
