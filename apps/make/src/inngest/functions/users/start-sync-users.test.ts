import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as organizationConnector from '@/connectors/make/organizations';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { env } from '@/common/env';
import { syncUsers } from './start-sync-users';

const region = 'us';
const token = 'test-token';
const organizationIds = ['test-id']

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  token,
  zoneDomain: 'zone-domain',
  region,
};

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'make/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true
    });

    // assert the function throws a NonRetriableError that will inform inngest to definitively cancel the event (no further retries)
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    // check that the function is not sending other events
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should sync users for each source organization and finalize the sync', async () => {
    const elba = spyOnElba();
    await db.insert(Organisation).values(organisation);

    vi.spyOn(organizationConnector, 'getOrganizationIds').mockResolvedValue(organizationIds);

    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);

    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.token);

    // check that the function sends sync events for each source organization
    expect(step.sendEvent).toBeCalledTimes(organizationIds.length);
    organizationIds.forEach((organizationId, index) => {
      expect(step.sendEvent).toHaveBeenNthCalledWith(index + 1, 'sync-users-page', {
        name: 'make/users.page_sync.requested',
        data: {
          organisationId: organisation.id,
          region: organisation.region,
          page: 0,
          sourceOrganizationId: 'test-id',
        },
      });

      // check that the function waits for the sync completion for each source organization
      expect(step.waitForEvent).toHaveBeenNthCalledWith(index + 1, 'wait-sync-organization-users', {
        event: 'make/users.organization_sync.completed',
        timeout: '1 day',
        if: `event.data.organisationId == '${organisation.id}' && event.data.sourceOrganizationId == '${organizationId}'`,
      });
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: organisation.id,
      region: organisation.region,
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });
});