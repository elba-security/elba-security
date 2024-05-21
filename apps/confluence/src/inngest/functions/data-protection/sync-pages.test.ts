import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as pagesConnector from '@/connectors/confluence/pages';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import { env } from '@/common/env';
import { accessToken, organisation, organisationUsers } from '../__mocks__/organisations';
import { pageWithRestrictions, pageWithRestrictionsObject } from '../__mocks__/confluence-pages';
import { syncPages } from './sync-pages';

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(
  syncPages,
  'confluence/data_protection.pages.sync.requested'
);

describe('sync-pages', () => {
  test('should abort when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(pagesConnector, 'getPagesWithRestrictions').mockResolvedValue({
      cursor: null,
      pages: [],
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      cursor: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);

    expect(pagesConnector.getPagesWithRestrictions).toBeCalledTimes(0);
  });

  test('should continue the sync when their is more pages', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(usersTable).values(organisationUsers);
    const elba = spyOnElba();
    vi.spyOn(pagesConnector, 'getPagesWithRestrictions').mockResolvedValue({
      cursor: 'next-cursor',
      pages: [pageWithRestrictions],
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      cursor: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(pagesConnector.getPagesWithRestrictions).toBeCalledTimes(1);
    expect(pagesConnector.getPagesWithRestrictions).toBeCalledWith({
      accessToken,
      instanceId: organisation.instanceId,
      cursor: null,
      limit: env.DATA_PROTECTION_PAGES_BATCH_SIZE,
    });

    expect(elba).toBeCalledTimes(1);

    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [pageWithRestrictionsObject],
    });
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('request-next-pages-sync', {
      name: 'confluence/data_protection.pages.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        cursor: 'next-cursor',
      },
    });
  });

  test('should finalize the sync when their is no more pages', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(usersTable).values(organisationUsers);
    const elba = spyOnElba();
    vi.spyOn(pagesConnector, 'getPagesWithRestrictions').mockResolvedValue({
      cursor: null,
      pages: [pageWithRestrictions],
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      cursor: 'cursor',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(pagesConnector.getPagesWithRestrictions).toBeCalledTimes(1);
    expect(pagesConnector.getPagesWithRestrictions).toBeCalledWith({
      accessToken,
      instanceId: organisation.instanceId,
      cursor: 'cursor',
      limit: env.DATA_PROTECTION_PAGES_BATCH_SIZE,
    });

    expect(elba).toBeCalledTimes(1);

    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [pageWithRestrictionsObject],
    });
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
