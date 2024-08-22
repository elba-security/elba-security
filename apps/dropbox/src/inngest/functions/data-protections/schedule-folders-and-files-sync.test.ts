import { createInngestFunctionMock } from '@elba-security/test-utils';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { db } from '@/database/client';
import { type Organisation, organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { scheduleDataProtectionSync } from './schedule-folders-and-files-sync';

const now = Date.now();

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const organisations: Omit<Organisation, 'createdAt'>[] = await Promise.all(
  Array.from({ length: 5 }, async (_, i) => ({
    id: `00000000-0000-0000-0000-00000000000${i}`,
    accessToken: await encrypt(`${newTokens.accessToken}-${i}`),
    refreshToken: await encrypt(`${newTokens.accessToken}-${i}`),
    adminTeamMemberId: `admin-team-member-id-${i}`,
    rootNamespaceId: `root-namespace-id-${i}`,
    region: 'us',
  }))
);

const setup = createInngestFunctionMock(scheduleDataProtectionSync);

describe('scheduleDataProtectionSync', () => {
  beforeEach(() => {
    vi.setSystemTime(now);
  });

  test('should not schedule any jobs when there are no organisations to refresh', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule sync jobs for the available organisations', async () => {
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      // eslint-disable-next-line -- @typescript-eslint/no-unsafe-assignment
      organisations: expect.arrayContaining(organisations.map(({ id }) => ({ id }))),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'start-shared-link-sync',
      expect.arrayContaining(
        organisations.map(({ id }) => ({
          data: {
            organisationId: id,
            isFirstSync: false,
            syncStartedAt: now,
            cursor: null,
          },
          name: 'dropbox/data_protection.shared_links.start.sync.requested',
        }))
      )
    );
  });
});
