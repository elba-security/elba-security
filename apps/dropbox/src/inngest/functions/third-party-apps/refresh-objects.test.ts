import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as crypto from '@/common/crypto';
import { db } from '@/database/client';
import type { Organisation } from '@/database/schema';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import * as appsConnector from '@/connectors/dropbox/apps';
import { env } from '@/common/env';
import { refreshThirdPartyAppsObject } from './refresh-objects';
import { createLinkedApps } from './__mocks__/member-linked-apps';

const organisation: Omit<Organisation, 'createdAt'> = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  adminTeamMemberId: 'admin-team-member-id',
  rootNamespaceId: 'root-namespace-id',
  region: 'us',
};

const setup = createInngestFunctionMock(
  refreshThirdPartyAppsObject,
  'dropbox/third_party_apps.refresh_objects.requested'
);

describe('refreshThirdPartyAppsObject', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test('should abort refresh when organisation is not registered', async () => {
    vi.spyOn(appsConnector, 'getMemberLinkedApps').mockResolvedValue({
      apps: [],
    });

    const elba = spyOnElba();
    const [result] = setup({
      organisationId: organisation.id,
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
    expect(appsConnector.getMemberLinkedApps).toBeCalledTimes(0);
  });

  test("should request elba to delete when the user does't have any linked apps", async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    vi.spyOn(appsConnector, 'getMemberLinkedApps').mockResolvedValue({
      apps: [],
    });

    const [result] = setup({
      organisationId: organisation.id,
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      ids: [
        {
          userId: 'team-member-id',
          appId: 'app-id',
        },
      ],
    });
  });

  test('should request elba to delete when the the app is not found in the source & rest of the apps should be refreshed', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    vi.spyOn(appsConnector, 'getMemberLinkedApps').mockResolvedValue({
      apps: createLinkedApps({
        length: 2,
        startFrom: 0,
      }).memberApps,
    });

    const [result] = setup({
      organisationId: organisation.id,
      userId: 'team-member-id',
      appId: 'app-id-10',
      isFirstSync: false,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: [
        {
          id: 'app-id-0',
          name: 'app-name-0',
          publisherName: 'publisher-0',
          url: 'publisher-url-0',
          users: [
            {
              createdAt: 'linked-0',
              id: 'team-member-id',
              scopes: [],
            },
          ],
        },
        {
          id: 'app-id-1',
          name: 'app-name-1',
          publisherName: 'publisher-1',
          url: 'publisher-url-1',
          users: [
            {
              createdAt: 'linked-1',
              id: 'team-member-id',
              scopes: [],
            },
          ],
        },
      ],
    });

    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      ids: [
        {
          userId: 'team-member-id',
          appId: 'app-id-10',
        },
      ],
    });
  });

  test('should fetch all the apps connected by the member and send to elba', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();

    const [result] = setup({
      organisationId: organisation.id,
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: [
        {
          id: 'app-id-0',
          name: 'app-name-0',
          publisherName: 'publisher-0',
          url: 'publisher-url-0',
          users: [
            {
              createdAt: 'linked-0',
              id: 'team-member-id',
              scopes: [],
            },
          ],
        },
        {
          id: 'app-id-1',
          name: 'app-name-1',
          publisherName: 'publisher-1',
          url: 'publisher-url-1',
          users: [
            {
              createdAt: 'linked-1',
              id: 'team-member-id',
              scopes: [],
            },
          ],
        },
      ],
    });
  });
});
