import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as googleTokens from '@/connectors/google/tokens';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { getOrganisation } from '../common/get-organisation';
import { refreshThirdPartyAppsObject } from './refresh-object';

const setup = createInngestFunctionMock(
  refreshThirdPartyAppsObject,
  'google/third_party_apps.refresh_object.requested'
);

describe('refresh-third-party-apps-object', () => {
  test('should refresh third party apps object successfully', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleTokens, 'getGoogleToken').mockImplementation(({ clientId }) => {
      return Promise.resolve({
        clientId: clientId as unknown as string,
        displayText: 'app',
        scopes: ['scope-1', 'scope-2'],
      });
    });

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'google-customer-id',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000000',
      appId: 'app-id',
      userId: 'user-id',
    });

    await expect(result).resolves.toStrictEqual({
      status: 'updated',
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

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(googleTokens.getGoogleToken).toBeCalledTimes(1);
    expect(googleTokens.getGoogleToken).toBeCalledWith({
      auth: authClient,
      clientId: 'app-id',
      userKey: 'user-id',
    });

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: [
        {
          id: 'app-id',
          name: 'app',
          users: [{ id: 'user-id', scopes: ['scope-1', 'scope-2'] }],
        },
      ],
    });

    expect(elbaInstance?.thirdPartyApps.deleteObjects).not.toBeCalled();
  });

  test("should delete third party apps object successfully if file doesn't exist anymore", async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleTokens, 'getGoogleToken').mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- on purpose
      return Promise.reject({
        code: 404,
        errors: [{ reason: 'notFound' }],
      });
    });

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'google-customer-id',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000000',
      appId: 'app-id',
      userId: 'user-id',
    });

    await expect(result).resolves.toStrictEqual({
      status: 'deleted',
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

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(googleTokens.getGoogleToken).toBeCalledTimes(1);
    expect(googleTokens.getGoogleToken).toBeCalledWith({
      auth: authClient,
      clientId: 'app-id',
      userKey: 'user-id',
    });

    expect(elbaInstance?.thirdPartyApps.updateObjects).not.toBeCalled();

    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      ids: [{ appId: 'app-id', userId: 'user-id' }],
    });
  });
});
