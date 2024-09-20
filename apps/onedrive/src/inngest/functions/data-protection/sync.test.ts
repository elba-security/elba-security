import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/microsoft/users/users';
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

const userIds: string[] = ['user-id-1', 'user-id-2'];

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
    vi.spyOn(usersConnector, 'getOrganisationUserIds').mockResolvedValue({
      nextSkipToken: null,
      userIds: [],
    });

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getOrganisationUserIds).toBeCalledTimes(0);

    expect(step.waitForEvent).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const nextSkipToken = 'next-skip-token';
    const skipToken = null;

    vi.spyOn(usersConnector, 'getOrganisationUserIds').mockResolvedValue({
      nextSkipToken,
      userIds,
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(usersConnector.getOrganisationUserIds).toBeCalledTimes(1);
    expect(usersConnector.getOrganisationUserIds).toBeCalledWith({
      token,
      tenantId,
      skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(userIds.length);

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];

      expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-items-complete-${userId}`, {
        event: 'onedrive/items.sync.completed',
        if: `async.data.organisationId == '${organisation.id}' && async.data.userId == '${userId}'`,
        timeout: '30d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'items-sync-triggered',
      userIds.map((id) => ({
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
    const nextSkipToken = null;
    const skipToken = 'skip-token';
    vi.spyOn(usersConnector, 'getOrganisationUserIds').mockResolvedValue({
      nextSkipToken,
      userIds,
    });
    const [result, { step }] = setup({
      ...setupData,
      skipToken,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(usersConnector.getOrganisationUserIds).toBeCalledTimes(1);
    expect(usersConnector.getOrganisationUserIds).toBeCalledWith({
      token,
      tenantId,
      skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(userIds.length);

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];

      expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-items-complete-${userId}`, {
        event: 'onedrive/items.sync.completed',
        if: `async.data.organisationId == '${organisation.id}' && async.data.userId == '${userId}'`,
        timeout: '30d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'items-sync-triggered',
      userIds.map((id) => ({
        name: 'onedrive/items.sync.triggered',
        data: {
          userId: id,
          isFirstSync,
          skipToken: nextSkipToken,
          organisationId: organisation.id,
        },
      }))
    );
  });
});
