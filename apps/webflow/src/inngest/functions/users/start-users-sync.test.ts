import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as sitesConnector from '@/connectors/webflow/sites';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { env } from '@/common/env';
import { syncUsers } from './start-users-sync';

const siteIds = ['test-id'];
const region = 'us';
const accessToken = 'access-token';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  siteIds,
  accessToken,
  region,
};

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'webflow/users.start_sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should sync users for each site and finalize the sync', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(sitesConnector, 'getSiteIds').mockResolvedValue(siteIds);

    // @ts-expect-error -- this is a mock
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(undefined);

    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith(organisation.accessToken);

    expect(step.sendEvent).toBeCalledTimes(siteIds.length);
    siteIds.forEach((siteId, index) => {
      expect(step.sendEvent).toHaveBeenNthCalledWith(index + 1, 'sync-users-page', {
        name: 'webflow/users.sync.requested',
        data: {
          organisationId: organisation.id,
          region: organisation.region,
          page: 0,
          siteId,
        },
      });

      // check that the function waits for the sync completion for each site
      expect(step.waitForEvent).toHaveBeenNthCalledWith(index + 1, 'wait-sync-site-users', {
        event: 'webflow/users.sync.completed',
        timeout: '1 day',
        if: `event.data.organisationId == '${organisation.id}' && event.data.siteId == '${siteId}'`,
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
