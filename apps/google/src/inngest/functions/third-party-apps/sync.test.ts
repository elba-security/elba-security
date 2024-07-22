import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import * as GoogleTokens from '@/connectors/google/tokens';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { getOrganisation } from '../common/get-organisation';
import { syncThirdPartyApps } from './sync';

const setup = createInngestFunctionMock(
  syncThirdPartyApps,
  'google/third_party_apps.sync.requested'
);

const mockedDate = '2024-01-01T00:00:00.000Z';

describe('sync-third-party-apps', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should sync third party apps successfully and handle pagination', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(GoogleTokens, 'listGoogleTokens').mockImplementation(({ userKey }) =>
      Promise.resolve([
        {
          clientId: 'client-id-1',
          displayText: 'app',
          scopes: userKey === 'user-id-1' ? ['scope-1', 'scope-2'] : ['scope-2', 'scope-3'],
        },
        userKey === 'user-id-1'
          ? {
              clientId: 'client-id-2',
              displayText: 'app',
              scopes: ['scope-1'],
            }
          : {
              clientId: 'client-id-3',
              displayText: 'app',
              scopes: ['scope-2'],
            },
      ])
    );

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'google-customer-id',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    await db.insert(usersTable).values([
      {
        id: 'user-id-1',
        email: 'admin@org.local',
        organisationId: '00000000-0000-0000-0000-000000000000',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'user-id-2',
        email: 'user@org.local',
        organisationId: '00000000-0000-0000-0000-000000000000',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
    ]);

    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000000',
      isFirstSync: true,
      pageToken: null,
      syncStartedAt: '2024-01-02T00:00:00Z',
    });

    await expect(result).resolves.toStrictEqual({
      status: 'ongoing',
    });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-organisation', {
      function: getOrganisation,
      data: {
        organisationId: '00000000-0000-0000-0000-000000000000',
        columns: ['region', 'googleAdminEmail'],
      },
    });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local', true);

    expect(step.run).toBeCalledTimes(4);
    expect(step.run).toBeCalledWith('list-users', expect.any(Function));

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.thirdPartyApps.deleteObjects).not.toBeCalled();

    expect(step.run).toBeCalledWith('list-user-user-id-1-apps', expect.any(Function));
    expect(step.run).toBeCalledWith('list-user-user-id-2-apps', expect.any(Function));

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(GoogleTokens.listGoogleTokens).toBeCalledTimes(2);
    expect(GoogleTokens.listGoogleTokens).toBeCalledWith({
      auth: authClient,
      userKey: 'user-id-1',
    });
    expect(GoogleTokens.listGoogleTokens).toBeCalledWith({
      auth: authClient,
      userKey: 'user-id-2',
    });

    expect(step.run).toBeCalledWith('finalize', expect.any(Function));

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: [
        {
          id: 'client-id-1',
          name: 'app',
          users: [
            { id: 'user-id-1', scopes: ['scope-1', 'scope-2'] },
            { id: 'user-id-2', scopes: ['scope-2', 'scope-3'] },
          ],
        },
        {
          id: 'client-id-2',
          name: 'app',
          users: [{ id: 'user-id-1', scopes: ['scope-1'] }],
        },
        {
          id: 'client-id-3',
          name: 'app',
          users: [{ id: 'user-id-2', scopes: ['scope-2'] }],
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-apps', {
      data: {
        isFirstSync: true,
        organisationId: '00000000-0000-0000-0000-000000000000',
        pageToken: 2,
        syncStartedAt: '2024-01-02T00:00:00Z',
      },
      name: 'google/third_party_apps.sync.requested',
    });
  });

  test('should sync third party apps successfully and end when pagination is over', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(GoogleTokens, 'listGoogleTokens').mockImplementation(({ userKey }) =>
      Promise.resolve([
        {
          clientId: 'client-id-1',
          displayText: 'app',
          scopes: userKey === 'user-id-1' ? ['scope-1', 'scope-2'] : ['scope-2', 'scope-3'],
        },
        userKey === 'user-id-1'
          ? {
              clientId: 'client-id-2',
              displayText: 'app',
              scopes: ['scope-1'],
            }
          : {
              clientId: 'client-id-3',
              displayText: 'app',
              scopes: ['scope-2'],
            },
      ])
    );

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'google-customer-id',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    await db.insert(usersTable).values([
      {
        id: 'user-id-1',
        email: 'admin@org.local',
        organisationId: '00000000-0000-0000-0000-000000000000',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'user-id-2',
        email: 'user@org.local',
        organisationId: '00000000-0000-0000-0000-000000000000',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
    ]);

    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000000',
      isFirstSync: true,
      pageToken: 2,
      syncStartedAt: '2024-01-02T00:00:00Z',
    });

    await expect(result).resolves.toStrictEqual({
      status: 'completed',
    });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-organisation', {
      function: getOrganisation,
      data: {
        organisationId: '00000000-0000-0000-0000-000000000000',
        columns: ['region', 'googleAdminEmail'],
      },
    });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local', true);

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toBeCalledWith('list-users', expect.any(Function));

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: '2024-01-02T00:00:00Z',
    });

    expect(GoogleTokens.listGoogleTokens).not.toBeCalled();

    expect(elbaInstance?.thirdPartyApps.updateObjects).not.toBeCalled();

    expect(step.sendEvent).not.toBeCalled();
  });
});
