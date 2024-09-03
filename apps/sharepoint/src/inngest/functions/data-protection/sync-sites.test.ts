import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as sitesConnector from '@/connectors/microsoft/sharepoint/sites';
import type { MicrosoftSite } from '@/connectors/microsoft/sharepoint/sites';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { syncSites } from './sync-sites';

const token = 'test-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const syncStartedAt = Date.now();
const isFirstSync = false;

const sites: MicrosoftSite[] = [{ id: 'site-id-1' }, { id: 'site-id-2' }];

const setupData = {
  organisationId: organisation.id,
  isFirstSync: false,
  syncStartedAt,
  skipToken: null,
};

const setup = createInngestFunctionMock(syncSites, 'sharepoint/data_protection.sync.requested');

describe('sync-sites', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(sitesConnector, 'getSites').mockResolvedValue({
      nextSkipToken: null,
      siteIds: [],
    });

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(sitesConnector.getSites).toBeCalledTimes(0);

    expect(step.waitForEvent).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const nextSkipToken = 'next-skip-token';
    const skipToken = null;

    vi.spyOn(sitesConnector, 'getSites').mockResolvedValue({
      nextSkipToken,
      siteIds: sites.map(({ id }) => id),
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(sitesConnector.getSites).toBeCalledTimes(1);
    expect(sitesConnector.getSites).toBeCalledWith({
      token,
      skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(sites.length);

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];

      expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-drives-complete-${site?.id}`, {
        event: 'sharepoint/drives.sync.completed',
        if: `async.data.organisationId == '${organisation.id}' && async.data.siteId == '${site?.id}'`,
        timeout: '30d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'drives-sync-triggered',
      sites.map(({ id }) => ({
        name: 'sharepoint/drives.sync.triggered',
        data: {
          siteId: id,
          isFirstSync,
          skipToken: null,
          organisationId: organisation.id,
        },
      }))
    );

    expect(step.sendEvent).toBeCalledWith('sync-next-sites-page', {
      name: 'sharepoint/data_protection.sync.requested',
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
    vi.spyOn(sitesConnector, 'getSites').mockResolvedValue({
      nextSkipToken,
      siteIds: sites.map(({ id }) => id),
    });
    const [result, { step }] = setup({
      ...setupData,
      skipToken,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(sitesConnector.getSites).toBeCalledTimes(1);
    expect(sitesConnector.getSites).toBeCalledWith({
      token,
      skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(sites.length);

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];

      expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-drives-complete-${site?.id}`, {
        event: 'sharepoint/drives.sync.completed',
        if: `async.data.organisationId == '${organisation.id}' && async.data.siteId == '${site?.id}'`,
        timeout: '30d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'drives-sync-triggered',
      sites.map(({ id }) => ({
        name: 'sharepoint/drives.sync.triggered',
        data: {
          siteId: id,
          isFirstSync,
          skipToken: nextSkipToken,
          organisationId: organisation.id,
        },
      }))
    );
  });
});
