import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import * as nangoAPI from '@/common/nango';
import * as usersConnector from '@/connectors/dropbox/users';
import { startFolderAndFileSync } from './start-folders-and-files-sync';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const syncStartedAt = Date.now();

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
  
  test('should fetch team members of the organisation & trigger events to synchronize folders and files', async () => {
    const elba = spyOnElba();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'valid-token' },
      }),
    });
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken: 'access-token',
      cursor: null,
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    users.forEach(({ profile }) => {
      expect(step.waitForEvent).toBeCalledWith(
        `wait-folder-and-file-sync-${profile.team_member_id}`,
        {
          event: 'dropbox/data_protection.folder_and_files.sync.completed',
          timeout: '1day',
          if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${profile.team_member_id}'`,
        }
      );
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'sync-folder-and-files',
      users.map((user) => ({
        name: 'dropbox/data_protection.folder_and_files.sync.requested',
        data: {
          organisationId,
          teamMemberId: user.profile.team_member_id,
          syncStartedAt,
          isFirstSync: false,
          cursor: null,
          nangoConnectionId,
          region,
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
    const elba = spyOnElba();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: 'next-cursor',
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(usersConnector.getUsers).toBeCalledTimes(1);
    expect(usersConnector.getUsers).toBeCalledWith({
      accessToken: 'access-token',
      cursor: null,
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    users.forEach(({ profile }) => {
      expect(step.waitForEvent).toBeCalledWith(
        `wait-folder-and-file-sync-${profile.team_member_id}`,
        {
          event: 'dropbox/data_protection.folder_and_files.sync.completed',
          timeout: '1day',
          if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${profile.team_member_id}'`,
        }
      );
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'sync-folder-and-files',
      users.map((user) => ({
        name: 'dropbox/data_protection.folder_and_files.sync.requested',
        data: {
          organisationId,
          teamMemberId: user.profile.team_member_id,
          syncStartedAt,
          isFirstSync: false,
          cursor: null,
          nangoConnectionId,
          region,
        },
      }))
    );

    expect(step.sendEvent).toBeCalledWith('start-folder-and-files-sync', {
      name: 'dropbox/data_protection.folder_and_files.start.sync.requested',
      data: {
        organisationId,
        cursor: 'next-cursor',
        syncStartedAt,
        isFirstSync: false,
        nangoConnectionId,
        region,
      },
    });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);
  });
});
