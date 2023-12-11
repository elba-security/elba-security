import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as githubOrganization from '@/connectors/organization';
import { Admin, Organisation } from '@/database/schema';
import { db } from '@/database/client';
import { spyOnElbaSdk } from '@/__mocks__/elba-sdk';
import { env } from '@/env';
import { syncUsersPage } from './sync-users-page';
import { elbaUsers } from './__mocks__/snapshots';
import { githubAdmins, githubUsers } from './__mocks__/github';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  installationId: 0,
  accountLogin: 'some-login',
};

const data = {
  installationId: organisation.installationId,
  organisationId: organisation.id,
  accountLogin: organisation.accountLogin,
  isFirstSync: true,
  syncStartedAt: Date.now(),
  cursor: null,
};

const setup = createInngestFunctionMock(syncUsersPage, 'users/page_sync.requested');

describe('sync-users-page', () => {
  beforeEach(async () => {
    await db.insert(Organisation).values(organisation);
  });

  test('should sync users page when there is another apps page', async () => {
    const elba = spyOnElbaSdk();
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

    await expect(db.select({ id: Admin.id }).from(Admin)).resolves.toMatchObject(
      githubAdmins.map(({ id }) => ({ id }))
    );

    expect(getPaginatedOrganizationMembers).toBeCalledTimes(1);
    expect(getPaginatedOrganizationMembers).toBeCalledWith(
      data.installationId,
      data.accountLogin,
      data.cursor
    );

    expect(elba.constructor).toBeCalledTimes(1);
    expect(elba.constructor).toBeCalledWith({
      organisationId: organisation.id,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    expect(elba.users.update).toBeCalledTimes(1);
    expect(elba.users.update).toBeCalledWith({
      users: githubUsers.map(({ id, email, name }) => ({
        id: String(id),
        email,
        displayName: name,
        additionalEmails: [],
      })),
    });

    expect(elba.users.delete).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users-page', {
      name: 'users/page_sync.requested',
      data: {
        ...data,
        cursor: nextCursor,
      },
    });
  });

  test('should sync users page and finalize when there is no other users page', async () => {
    const elba = spyOnElbaSdk();
    const getPaginatedOrganizationMembers = vi
      .spyOn(githubOrganization, 'getPaginatedOrganizationMembers')
      .mockResolvedValue({
        nextCursor: null,
        validMembers: githubUsers,
        invalidMembers: [],
      });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    await expect(db.select({ id: Admin.id }).from(Admin)).resolves.toMatchObject(
      githubAdmins.map(({ id }) => ({ id }))
    );

    expect(getPaginatedOrganizationMembers).toBeCalledTimes(1);
    expect(getPaginatedOrganizationMembers).toBeCalledWith(
      data.installationId,
      data.accountLogin,
      data.cursor
    );

    expect(elba.constructor).toBeCalledTimes(1);
    expect(elba.constructor).toBeCalledWith({
      organisationId: organisation.id,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    expect(elba.users.update).toBeCalledTimes(1);
    expect(elba.users.update).toBeCalledWith({
      users: elbaUsers,
    });

    expect(elba.users.delete).toBeCalledTimes(1);
    expect(elba.users.delete).toBeCalledWith({
      syncedBefore: new Date(data.syncStartedAt).toISOString(),
    });

    expect(step.sendEvent).not.toBeCalled();
  });
});
