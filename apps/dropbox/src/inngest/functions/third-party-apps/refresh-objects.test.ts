import { beforeEach, describe, expect, test, vi } from 'vitest';
import { memberLinkedApps, membersLinkedAppFirstPage } from './__mocks__/member-linked-apps';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { refreshThirdPartyAppsObject } from './refresh-objects';
import { insertOrganisations } from '@/test-utils/token';
import { db, organisations } from '@/database';

const organisationId = '00000000-0000-0000-0000-000000000001';
const sourceId = '00000000-0000-0000-0000-000000000008';

const mocks = vi.hoisted(() => {
  return {
    teamLinkedAppsListMemberLinkedAppsMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-access', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamLinkedAppsListMemberLinkedApps: mocks.teamLinkedAppsListMemberLinkedAppsMock,
      };
    }),
  };
});

const setup = createInngestFunctionMock(
  refreshThirdPartyAppsObject,
  'third-party-apps/refresh-objects'
);

describe('third-party-apps-refresh-objects', () => {
  beforeEach(async () => {
    await db.delete(organisations);
    await insertOrganisations({});
    vi.clearAllMocks();
  });

  test("should request elba to delete when the user does't have any linked apps", async () => {
    const elba = spyOnElba();
    mocks.teamLinkedAppsListMemberLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          linked_api_apps: [],
        },
      };
    });

    const [result] = await setup({
      organisationId,
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      sourceId,
      region: 'eu',
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
    const elba = spyOnElba();
    mocks.teamLinkedAppsListMemberLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          linked_api_apps: [
            {
              app_id: 'app-id-2',
              app_name: 'app-name-2',
              publisher: 'publisher-2',
              publisher_url: 'https://foo.com',
              linked: '2023-01-23T16:53:47Z',
              is_app_folder: false,
            },
          ],
        },
      };
    });

    const [result] = await setup({
      organisationId,
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      sourceId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: [
        {
          id: 'app-id-2',
          name: 'app-name-2',
          publisherName: 'publisher-2',
          url: 'https://foo.com',
          users: [
            {
              createdAt: '2023-01-23T16:53:47Z',
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
          appId: 'app-id',
        },
      ],
    });
  });

  test('should fetch all the apps connected by the member and send to elba', async () => {
    const elba = spyOnElba();
    mocks.teamLinkedAppsListMemberLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          linked_api_apps: membersLinkedAppFirstPage.at(0)?.linked_api_apps,
        },
      };
    });

    const [result] = await setup({
      organisationId,
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      sourceId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith(memberLinkedApps);
  });
});
