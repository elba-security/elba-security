import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import type { SelectOrganisation } from '@/database/schema';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { scheduleUsersSync } from './schedule-user-sync';

const mockedDate = 1714739551128;

const organisations: Omit<SelectOrganisation, 'createdAt'>[] = Array.from(
  { length: 2 },
  (_, i) => ({
    id: `00000000-0000-0000-0000-00000000000${i}`,
    token: `test-token-${i}`,
    region: 'us',
  })
);

const setup = createInngestFunctionMock(scheduleUsersSync);

describe('schedule-users-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not schedule sync when there are no organizations', async () => {
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({ organisations: [] });

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule sync when there are organizations', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({
      organisations: organisations.map(({ id }) => ({ id })),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-organisations-users', [
      {
        data: {
          organisationId: '00000000-0000-0000-0000-000000000000',
          isFirstSync: false,
          syncStartedAt: mockedDate,
          page: 1,
        },
        name: 'monday/users.sync.requested',
      },
      {
        data: {
          organisationId: '00000000-0000-0000-0000-000000000001',
          isFirstSync: false,
          syncStartedAt: mockedDate,
          page: 1,
        },
        name: 'monday/users.sync.requested',
      },
    ]);
  });
});
