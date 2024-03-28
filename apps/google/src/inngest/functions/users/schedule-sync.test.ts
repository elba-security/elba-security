import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { scheduleUsersSync } from './schedule-sync';

const setup = createInngestFunctionMock(scheduleUsersSync);

const mockedDate = '2024-01-01T00:00:00.000Z';

describe('schedule-users-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should not start users sync when there are no organisations', async () => {
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({ organisationIds: [] });

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toBeCalledWith('get-organisations', expect.any(Function));

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should start users sync successfully', async () => {
    await db.insert(organisationsTable).values([
      {
        googleAdminEmail: 'admin@org1.local',
        googleCustomerId: 'google-customer-id-1',
        id: '00000000-0000-0000-0000-000000000000',
        region: 'eu',
      },
      {
        googleAdminEmail: 'admin@org2.local',
        googleCustomerId: 'google-customer-id-2',
        id: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
      },
    ]);

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisationIds: [
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
      ],
    });

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toBeCalledWith('get-organisations', expect.any(Function));

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('start-users-sync', [
      {
        data: {
          isFirstSync: false,
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          syncStartedAt: '2024-01-01T00:00:00.000Z',
        },
        name: 'google/users.sync.requested',
      },
      {
        data: {
          isFirstSync: false,
          organisationId: '00000000-0000-0000-0000-000000000001',
          pageToken: null,
          syncStartedAt: '2024-01-01T00:00:00.000Z',
        },
        name: 'google/users.sync.requested',
      },
    ]);
  });
});
