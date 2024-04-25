import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as googleUsers from '@/connectors/google/users';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { getOrganisation } from '../common/get-organisation';
import { refreshAuthenticationObject } from './refresh-object';

const setup = createInngestFunctionMock(
  refreshAuthenticationObject,
  'google/authentication.refresh_object.requested'
);

describe('refresh-authentication-object', () => {
  test('should refresh authentication object successfully', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleUsers, 'getGoogleUser').mockImplementation(({ userKey }) => {
      return Promise.resolve({
        id: userKey as unknown as string,
        primaryEmail: 'user@org.local',
        emails: [{ address: 'user1@org.local' }, { address: 'user2@org.local' }],
        name: {
          fullName: 'John Doe',
        },
        isEnrolledIn2Sv: true,
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

    expect(googleUsers.getGoogleUser).toBeCalledTimes(1);
    expect(googleUsers.getGoogleUser).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      userKey: 'user-id',
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: ['user1@org.local', 'user2@org.local'],
          authMethod: 'mfa',
          displayName: 'John Doe',
          email: 'user@org.local',
          id: 'user-id',
        },
      ],
    });
  });
});
