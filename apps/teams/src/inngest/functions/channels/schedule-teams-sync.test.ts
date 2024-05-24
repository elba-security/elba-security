import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { scheduleTeamsSync } from '@/inngest/functions/channels/schedule-teams-sync';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleTeamsSync);

export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  tenantId: `tenant-${i}`,
  token: `token-${i}`,
  region: 'us',
}));

const selectOrganisations = Array.from({ length: 5 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
}));

describe('schedule-teams-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule do nothing when there are no organisations', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule start sync when there are organisations', async () => {
    await db.insert(organisationsTable).values(organisations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: selectOrganisations,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-schedule-teams',
      organisations.map((organisation) => ({
        name: 'teams/teams.sync.requested',
        data: {
          organisationId: organisation.id,
          syncStartedAt: new Date().toISOString(),
          skipToken: null,
          isFirstSync: true,
        },
      }))
    );
  });
});
