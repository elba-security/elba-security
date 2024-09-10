import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest/components/NonRetriableError';
import * as crypto from '@/common/crypto';
import * as usersConnector from '@/connectors/dropbox/users';
import { encrypt } from '@/common/crypto';
import { organisationsTable, type Organisation } from '@/database/schema';
import { db } from '@/database/client';
import { startFolderAndFileSync } from './start-folders-and-files-sync';

const syncStartedAt = Date.now();

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const organisation: Omit<Organisation, 'createdAt'> = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt(newTokens.accessToken),
  refreshToken: await encrypt(newTokens.accessToken),
  adminTeamMemberId: 'admin-team-member-id',
  rootNamespaceId: 'root-namespace-id',
  region: 'us',
};

const users: usersConnector.DropboxTeamMember[] = Array.from({ length: 2 }, (_, i) => ({
  profile: {
    team_member_id: `dbmid:team-member-id-${i}`,
    name: { display_name: `name-${i}` },
    email: `user-${i}@foo.com`,
    root_folder_id: `root-folder-id-${i}`,
    status: { '.tag': 'active' },
    secondary_emails: [],
  },
}));

const setup = createInngestFunctionMock(
  startFolderAndFileSync,
  'dropbox/data_protection.folder_and_files.start.sync.requested'
);

describe('startFolderAndFileSync', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue(newTokens.accessToken);
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: [],
      invalidUsers: [],
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      cursor: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(usersConnector.getUsers).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should fetch team members of the organisation & trigger events to synchronize folders and files', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      cursor: null,
    });

    await expect(result).resolves.toBeUndefined();

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken: newTokens.accessToken,
      cursor: null,
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    users.forEach(({ profile }) => {
      expect(step.waitForEvent).toBeCalledWith(
        `wait-folder-and-file-sync-${profile.team_member_id}`,
        {
          event: 'dropbox/data_protection.folder_and_files.sync.completed',
          timeout: '1day',
          if: `async.data.organisationId == '${organisation.id}' && async.data.teamMemberId == '${profile.team_member_id}'`,
        }
      );
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-folder-and-files',
      users.map((user) => ({
        name: 'dropbox/data_protection.folder_and_files.sync.requested',
        data: {
          organisationId: organisation.id,
          teamMemberId: user.profile.team_member_id,
          syncStartedAt,
          isFirstSync: false,
          cursor: null,
        },
      }))
    );
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });

  test('should fetch team members of the organisation, trigger events to synchronize folders and files & trigger next page', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: 'next-cursor',
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      cursor: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken: newTokens.accessToken,
      cursor: null,
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    users.forEach(({ profile }) => {
      expect(step.waitForEvent).toBeCalledWith(
        `wait-folder-and-file-sync-${profile.team_member_id}`,
        {
          event: 'dropbox/data_protection.folder_and_files.sync.completed',
          timeout: '1day',
          if: `async.data.organisationId == '${organisation.id}' && async.data.teamMemberId == '${profile.team_member_id}'`,
        }
      );
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'sync-folder-and-files',
      users.map((user) => ({
        name: 'dropbox/data_protection.folder_and_files.sync.requested',
        data: {
          organisationId: organisation.id,
          teamMemberId: user.profile.team_member_id,
          syncStartedAt,
          isFirstSync: false,
          cursor: null,
        },
      }))
    );

    expect(step.sendEvent).toBeCalledWith('start-folder-and-files-sync', {
      name: 'dropbox/data_protection.folder_and_files.start.sync.requested',
      data: {
        organisationId: organisation.id,
        cursor: 'next-cursor',
        syncStartedAt,
        isFirstSync: false,
      },
    });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);
  });
});
