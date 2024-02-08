import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as githubOrganization from '@/connectors/github/organization';
import { adminsTable, organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { env } from '@/env';
import { syncUsersPage } from './sync-users-page';
import { elbaUsers } from './__mocks__/snapshots';
import { githubAdmins, githubUsers } from './__mocks__/github';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  installationId: 0,
  accountLogin: 'some-login',
  region: 'us',
};

const data = {
  installationId: organisation.installationId,
  organisationId: organisation.id,
  accountLogin: organisation.accountLogin,
  isFirstSync: true,
  syncStartedAt: Date.now(),
  region: 'us',
  cursor: null,
};

const setup = createInngestFunctionMock(syncUsersPage, 'github/users.page_sync.requested');

describe('sync-users-page', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should sync users page when there is another apps page', async () => {
    const elba = spyOnElba();
    const nextCursor = '1234';
    const getPaginatedOrganizationMembers = vi
      .spyOn(githubOrganization, 'getPaginatedOrganizationMembers')
      .mockResolvedValue({
        nextCursor,
        validMembers: githubUsers,
        invalidMembers: [],
      });
    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    await expect(db.select({ id: adminsTable.id }).from(adminsTable)).resolves.toMatchObject(
      githubAdmins.map(({ id }) => ({ id }))
    );

    expect(getPaginatedOrganizationMembers).toBeCalledTimes(1);
    expect(getPaginatedOrganizationMembers).toBeCalledWith(
      data.installationId,
      data.accountLogin,
      data.cursor
    );

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: githubUsers.map(({ id, email, name, role }) => ({
        id: String(id),
        email,
        displayName: name,
        role,
        additionalEmails: [],
      })),
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'github/users.page_sync.requested',
      data: {
        ...data,
        cursor: nextCursor,
      },
    });
  });

  test('should sync users page and finalize when there is no other users page', async () => {
    const elba = spyOnElba();
    const getPaginatedOrganizationMembers = vi
      .spyOn(githubOrganization, 'getPaginatedOrganizationMembers')
      .mockResolvedValue({
        nextCursor: null,
        validMembers: githubUsers,
        invalidMembers: [],
      });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    await expect(db.select({ id: adminsTable.id }).from(adminsTable)).resolves.toMatchObject(
      githubAdmins.map(({ id }) => ({ id }))
    );

    expect(getPaginatedOrganizationMembers).toBeCalledTimes(1);
    expect(getPaginatedOrganizationMembers).toBeCalledWith(
      data.installationId,
      data.accountLogin,
      data.cursor
    );

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: elbaUsers,
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(data.syncStartedAt).toISOString(),
    });

    expect(step.sendEvent).not.toBeCalled();
  });
});
