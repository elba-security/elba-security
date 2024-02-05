import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { scheduleDataProtectionSync } from './schedule-data-protection-sync';

const setup = createInngestFunctionMock(scheduleDataProtectionSync);

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('schedule-data-protection-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule sync when there are no teams', async () => {
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({ teams: [] });

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule sync when there are teams', async () => {
    await db.insert(teamsTable).values([
      {
        adminId: 'admin-id-1',
        elbaOrganisationId: 'org-id-1',
        elbaRegion: 'eu',
        id: 'team-id-1',
        token: 'token-1',
        url: 'url-1',
      },
      {
        adminId: 'admin-id-2',
        elbaOrganisationId: 'org-id-2',
        elbaRegion: 'eu',
        id: 'team-id-2',
        token: 'token-2',
        url: 'url-2',
      },
    ]);

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      teams: [{ id: 'team-id-1' }, { id: 'team-id-2' }],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('start-data-protection-sync', [
      {
        data: {
          isFirstSync: false,
          syncStartedAt: mockedDate,
          teamId: 'team-id-1',
        },
        name: 'slack/conversations.sync.requested',
      },
      {
        data: {
          isFirstSync: false,
          syncStartedAt: mockedDate,
          teamId: 'team-id-2',
        },
        name: 'slack/conversations.sync.requested',
      },
    ]);
  });
});
