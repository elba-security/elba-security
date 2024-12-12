import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as deltaConnector from '@/connectors/microsoft/delta/delta';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { syncDataProtection } from './sync';

const token = 'test-token';
const tenantId = 'tenant-id';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId,
  region: 'us',
};

const syncStartedAt = Date.now();
const isFirstSync = false;

const members: deltaConnector.ParsedDeltaUsers['updated'] = Array.from({ length: 2 }, (_, i) => ({
  id: `user-id-${i + 1}`,
  userType: 'Member',
}));

const guestUser: deltaConnector.ParsedDeltaUsers['updated'][number] = {
  id: 'guest',
  userType: 'Guest',
};

const setupData = {
  organisationId: organisation.id,
  isFirstSync: false,
  syncStartedAt,
  skipToken: null,
};

const setup = createInngestFunctionMock(
  syncDataProtection,
  'onedrive/data_protection.sync.requested'
);

describe('sync-data-protection', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(deltaConnector, 'getDeltaUsers').mockResolvedValue({
      users: { updated: [], deleted: [] },
      newDeltaToken: '',
    });

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(deltaConnector.getDeltaUsers).toBeCalledTimes(0);

    expect(step.waitForEvent).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should ignore guests and continue the sync when there is a next page', async () => {
    const nextSkipToken = 'next-skip-token';
    vi.spyOn(deltaConnector, 'getDeltaUsers').mockResolvedValue({
      users: { updated: [...members, guestUser], deleted: [] },
      nextSkipToken,
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(deltaConnector.getDeltaUsers).toBeCalledTimes(1);
    expect(deltaConnector.getDeltaUsers).toBeCalledWith({
      tenantId,
      token,
      skipToken: setupData.skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(members.length);

    for (let i = 0; i < members.length; i++) {
      const userId = members[i]?.id;

      expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-items-complete-${userId}`, {
        event: 'onedrive/items.sync.completed',
        if: `async.data.organisationId == '${organisation.id}' && async.data.userId == '${userId}'`,
        timeout: '30d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'items-sync-triggered',
      members.map(({ id }) => ({
        name: 'onedrive/items.sync.triggered',
        data: {
          userId: id,
          isFirstSync,
          skipToken: null,
          organisationId: organisation.id,
        },
      }))
    );

    expect(step.sendEvent).toBeCalledWith('sync-next-page', {
      name: 'onedrive/data_protection.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync,
        syncStartedAt,
        skipToken: nextSkipToken,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const skipToken = 'skip-token';
    vi.spyOn(deltaConnector, 'getDeltaUsers').mockResolvedValue({
      newDeltaToken: 'new-delta-token',
      users: { updated: members, deleted: [] },
    });
    const [result, { step }] = setup({
      ...setupData,
      skipToken,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(deltaConnector.getDeltaUsers).toBeCalledTimes(1);
    expect(deltaConnector.getDeltaUsers).toBeCalledWith({
      token,
      tenantId,
      skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(members.length);

    for (let i = 0; i < members.length; i++) {
      const userId = members[i]?.id;

      expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-items-complete-${userId}`, {
        event: 'onedrive/items.sync.completed',
        if: `async.data.organisationId == '${organisation.id}' && async.data.userId == '${userId}'`,
        timeout: '30d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'items-sync-triggered',
      members.map(({ id }) => ({
        name: 'onedrive/items.sync.triggered',
        data: {
          userId: id,
          isFirstSync,
          skipToken: null,
          organisationId: organisation.id,
        },
      }))
    );
  });
});
