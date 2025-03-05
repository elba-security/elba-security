import { describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import * as appsConnector from '@/connectors/dropbox/apps';
import { env } from '@/common/env';
import { refreshThirdPartyAppsObject } from './refresh-objects';
import { createLinkedApps } from './__mocks__/member-linked-apps';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const setup = createInngestFunctionMock(
  refreshThirdPartyAppsObject,
  'dropbox/third_party_apps.refresh_objects.requested'
);

describe('refreshThirdPartyAppsObject', () => {
  test("should request elba to delete when the user does't have any linked apps", async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    const elba = spyOnElba();
    vi.spyOn(appsConnector, 'getMemberLinkedApps').mockResolvedValue({
      apps: [],
    });

    const [result] = setup({
      organisationId,
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
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
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    const elba = spyOnElba();
    vi.spyOn(appsConnector, 'getMemberLinkedApps').mockResolvedValue({
      apps: createLinkedApps({
        length: 2,
        startFrom: 0,
      }).memberApps,
    });

    const [result] = setup({
      organisationId,
      userId: 'team-member-id',
      appId: 'app-id-10',
      isFirstSync: false,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
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
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    const elba = spyOnElba();

    const [result] = setup({
      organisationId,
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
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
