import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { StepError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as googleUsers from '@/connectors/google/users';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { GoogleUserNotAdminError } from '@/connectors/google/errors';
import { env } from '@/common/env/server';
import { getOrganisation } from '../common/get-organisation';
import { syncUsers } from './sync';

const setup = createInngestFunctionMock(syncUsers, 'gmail/users.sync.requested');

const mockedDate = '2024-01-01T00:00:00.000Z';

describe('sync-users', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should sync users successfully and handle pagination', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleUsers, 'checkUserIsAdmin').mockResolvedValue();
    vi.spyOn(googleUsers, 'listGoogleUsers').mockResolvedValue({
      users: [
        {
          id: 'user-id-2',
          name: { fullName: 'John Doe' },
          primaryEmail: 'user2@org.local',
          emails: [{ address: 'john.doe@org.local' }],
        },
        {
          id: 'user-id-1',
          name: { fullName: 'Admin' },
          primaryEmail: 'admin@org.local',
          isEnrolledIn2Sv: true,
        },
      ],
      nextPageToken: 'next-page-token',
    });

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'google-customer-id',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

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
        columns: ['region', 'googleAdminEmail', 'googleCustomerId'],
      },
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    expect(step.run).toBeCalledTimes(2);
    expect(step.run).toBeCalledWith('list-users', expect.any(Function));

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local', true);

    const authClient = serviceAccountClientSpy.mock.settledResults[0]?.value as unknown;

    expect(googleUsers.checkUserIsAdmin).toHaveBeenCalledTimes(1);
    expect(googleUsers.checkUserIsAdmin).toHaveBeenCalledWith({
      auth: authClient,
      userId: 'admin@org.local',
    });

    expect(googleUsers.listGoogleUsers).toBeCalledTimes(1);
    expect(googleUsers.listGoogleUsers).toBeCalledWith({
      auth: authClient,
      customer: 'google-customer-id',
      maxResults: 500,
      pageToken: undefined,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.run).toBeCalledWith('update-elba-users', expect.any(Function));

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: ['john.doe@org.local'],
          authMethod: 'password',
          displayName: 'John Doe',
          email: 'user2@org.local',
          id: 'user-id-2',
        },
        {
          additionalEmails: [],
          authMethod: 'mfa',
          displayName: 'Admin',
          email: 'admin@org.local',
          id: 'user-id-1',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      data: {
        isFirstSync: true,
        organisationId: '00000000-0000-0000-0000-000000000000',
        pageToken: 'next-page-token',
        syncStartedAt: '2024-01-02T00:00:00Z',
      },
      name: 'gmail/users.sync.requested',
    });

    expect(elbaInstance?.users.delete).not.toBeCalled();
  });

  test('should sync users successfully and end when pagination is over', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleUsers, 'checkUserIsAdmin').mockResolvedValue();
    vi.spyOn(googleUsers, 'listGoogleUsers').mockResolvedValue({
      users: [
        {
          id: 'user-id-2',
          name: { fullName: 'John Doe' },
          primaryEmail: 'user2@org.local',
          emails: [{ address: 'john.doe@org.local' }],
        },
        {
          id: 'user-id-1',
          name: { fullName: 'Admin' },
          primaryEmail: 'admin@org.local',
          isEnrolledIn2Sv: true,
        },
      ],
      nextPageToken: null,
    });

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'google-customer-id',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000000',
      isFirstSync: true,
      pageToken: null,
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
        columns: ['region', 'googleAdminEmail', 'googleCustomerId'],
      },
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    expect(step.run).toBeCalledTimes(2);
    expect(step.run).toBeCalledWith('list-users', expect.any(Function));

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local', true);

    const authClient = serviceAccountClientSpy.mock.settledResults[0]?.value as unknown;

    expect(googleUsers.checkUserIsAdmin).toHaveBeenCalledTimes(1);
    expect(googleUsers.checkUserIsAdmin).toHaveBeenCalledWith({
      auth: authClient,
      userId: 'admin@org.local',
    });

    expect(googleUsers.listGoogleUsers).toBeCalledTimes(1);
    expect(googleUsers.listGoogleUsers).toBeCalledWith({
      auth: authClient,
      customer: 'google-customer-id',
      maxResults: 500,
      pageToken: undefined,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.run).toBeCalledWith('update-elba-users', expect.any(Function));

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: ['john.doe@org.local'],
          authMethod: 'password',
          displayName: 'John Doe',
          email: 'user2@org.local',
          id: 'user-id-2',
        },
        {
          additionalEmails: [],
          authMethod: 'mfa',
          displayName: 'Admin',
          email: 'admin@org.local',
          id: 'user-id-1',
        },
      ],
    });

    expect(step.sendEvent).not.toBeCalled();

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: '2024-01-02T00:00:00Z' });
  });

  test('should not sync users when user is not admin', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    const userNotAdminError = new GoogleUserNotAdminError('User is not admin');
    vi.spyOn(googleUsers, 'checkUserIsAdmin').mockRejectedValue(userNotAdminError);
    vi.spyOn(googleUsers, 'listGoogleUsers').mockResolvedValue({
      users: [
        {
          id: 'user-id-2',
          name: { fullName: 'John Doe' },
          primaryEmail: 'user2@org.local',
          emails: [{ address: 'john.doe@org.local' }],
        },
        {
          id: 'user-id-1',
          name: { fullName: 'Admin' },
          primaryEmail: 'admin@org.local',
          isEnrolledIn2Sv: true,
        },
      ],
      nextPageToken: null,
    });

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'google-customer-id',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000000',
      isFirstSync: true,
      pageToken: null,
      syncStartedAt: '2024-01-02T00:00:00Z',
    });

    await expect(result).rejects.toThrowError(new StepError('list-users', userNotAdminError));

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-organisation', {
      function: getOrganisation,
      data: {
        organisationId: '00000000-0000-0000-0000-000000000000',
        columns: ['region', 'googleAdminEmail', 'googleCustomerId'],
      },
    });

    expect(elba).toBeCalledTimes(0);

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toBeCalledWith('list-users', expect.any(Function));

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local', true);

    const authClient = serviceAccountClientSpy.mock.settledResults[0]?.value as unknown;

    expect(googleUsers.checkUserIsAdmin).toHaveBeenCalledTimes(1);
    expect(googleUsers.checkUserIsAdmin).toHaveBeenCalledWith({
      auth: authClient,
      userId: 'admin@org.local',
    });

    expect(googleUsers.listGoogleUsers).toBeCalledTimes(0);

    expect(step.run).not.toBeCalledWith('update-elba-users', expect.any(Function));

    expect(step.sendEvent).not.toBeCalled();
  });
});
