import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as pagesConnector from '@/connectors/confluence/pages';
import { db } from '@/database/client';
import * as nangoAPI from '@/common/nango';
import * as authConnector from '@/connectors/confluence/auth';
import { usersTable } from '@/database/schema';
import { env } from '@/common/env';
import { accessToken, organisationUsers } from '../__mocks__/organisations';
import { pageWithRestrictions, pageWithRestrictionsObject } from '../__mocks__/confluence-pages';
import { syncPages } from './sync-pages';

const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const instanceId = '1234';

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(
  syncPages,
  'confluence/data_protection.pages.sync.requested'
);

describe('sync-pages', () => {
  beforeEach(async () => {
    await db.delete(usersTable).execute();
  });

  test('should continue the sync when their is more pages', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
      id: '1234',
      url: 'http://foo.bar',
    });
    await db.insert(usersTable).values(organisationUsers);
    const elba = spyOnElba();
    vi.spyOn(pagesConnector, 'getPagesWithRestrictions').mockResolvedValue({
      cursor: 'next-cursor',
      pages: [pageWithRestrictions],
    });
    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(pagesConnector.getPagesWithRestrictions).toBeCalledTimes(1);
    expect(pagesConnector.getPagesWithRestrictions).toBeCalledWith({
      accessToken,
      instanceId,
      cursor: null,
      limit: env.DATA_PROTECTION_PAGES_BATCH_SIZE,
    });

    expect(elba).toBeCalledTimes(1);

    expect(elba).toBeCalledWith({
      organisationId,
      region,
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
        organisationId,
        isFirstSync: false,
        syncStartedAt,
        cursor: 'next-cursor',
        nangoConnectionId,
        region,
      },
    });
  });

  test('should finalize the sync when their is no more pages', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
      id: '1234',
      url: 'http://foo.bar',
    });
    await db.insert(usersTable).values(organisationUsers);
    const elba = spyOnElba();
    vi.spyOn(pagesConnector, 'getPagesWithRestrictions').mockResolvedValue({
      cursor: null,
      pages: [pageWithRestrictions],
    });
    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      cursor: 'cursor',
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(pagesConnector.getPagesWithRestrictions).toBeCalledTimes(1);
    expect(pagesConnector.getPagesWithRestrictions).toBeCalledWith({
      accessToken,
      instanceId,
      cursor: 'cursor',
      limit: env.DATA_PROTECTION_PAGES_BATCH_SIZE,
    });

    expect(elba).toBeCalledTimes(1);

    expect(elba).toBeCalledWith({
      organisationId,
      region,
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
