import { createInngestFunctionMock } from '@elba-security/test-utils';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { scheduleDataProtectionSyncJobs } from './schedule-data-protection-sync';

type Organisation = typeof organisationsTable.$inferInsert;

const defaultAccessToken = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    token: 'test-access-token',
    region: 'eu',
    tenantId: 'tenant-1',
    createdAt: new Date(),
  },
];

const insertTestAccessToken = async (organisations: Organisation[] = defaultAccessToken) => {
  return db.insert(organisationsTable).values(organisations).returning({
    id: organisationsTable.id,
  });
};

const insertOrganisations = async (size = 1) => {
  const tokenPromises = Array.from({ length: size }, (_, index) => ({
    organisationId: `00000000-0000-0000-0000-00000000000${index + 1}`,
    accessToken: `access-token-${index + 1}`,
  })).map(({ accessToken, organisationId }, idx) => {
    return {
      id: organisationId,
      token: accessToken,
      region: 'eu',
      tenantId: `tenant-${idx}`,
      createdAt: new Date(),
    };
  });

  return insertTestAccessToken(tokenPromises);
};

const setup = createInngestFunctionMock(scheduleDataProtectionSyncJobs);

describe('scheduleDataProtectionSyncJobs', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-03-25T10:00:00.007Z'));
    vi.clearAllMocks();
  });

  test('should not schedule any jobs when there are no organisations to refresh', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule sync jobs for the available organisations', async () => {
    await insertOrganisations();

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: [
        {
          id: '00000000-0000-0000-0000-000000000001',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('start-sync-members', [
      {
        data: {
          isFirstSync: false,
          organisationId: '00000000-0000-0000-0000-000000000001',
          syncStartedAt: 1711360800007,
          skipToken: null,
        },
        name: 'onedrive/data_protection.sync.requested',
      },
    ]);
  });
});
