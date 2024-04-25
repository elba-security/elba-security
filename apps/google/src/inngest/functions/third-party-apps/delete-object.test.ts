import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as googleTokens from '@/connectors/google/tokens';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { getOrganisation } from '../common/get-organisation';
import { deleteThirdPartyAppsObject } from './delete-object';

const setup = createInngestFunctionMock(
  deleteThirdPartyAppsObject,
  'google/third_party_apps.delete_object.requested'
);

describe('delete-third-party-apps-object', () => {
  test('should delete third party apps object successfully', async () => {
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    // @ts-expect-error -- this is a mock
    vi.spyOn(googleTokens, 'deleteGoogleToken').mockResolvedValue(undefined);

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
        columns: ['googleAdminEmail'],
      },
    });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local', true);

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(googleTokens.deleteGoogleToken).toBeCalledTimes(1);
    expect(googleTokens.deleteGoogleToken).toBeCalledWith({
      auth: authClient,
      clientId: 'app-id',
      userKey: 'user-id',
    });
  });
});
