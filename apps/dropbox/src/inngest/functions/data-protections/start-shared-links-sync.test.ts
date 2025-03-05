import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import * as nangoAPI from '@/common/nango';
import * as usersConnector from '@/connectors/dropbox/users';
import { startSharedLinksSync } from './start-shared-links-sync';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const now = Date.now();

const syncStartedAt = Date.now();
const nextCursor = 'next-page-cursor';

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

const jobArgs = {
  organisationId,
  syncStartedAt,
  isFirstSync: false,
};

const sharedLinkJobs = users.flatMap(({ profile }) => {
  return [
    {
      ...jobArgs,
      teamMemberId: profile.team_member_id,
      isPersonal: false,
      pathRoot: profile.root_folder_id,
      cursor: null,
      nangoConnectionId,
      region,
    },
    {
      ...jobArgs,
      teamMemberId: profile.team_member_id,
      isPersonal: true,
      pathRoot: null,
      cursor: null,
      nangoConnectionId,
      region,
    },
  ];
});

const setup = createInngestFunctionMock(
  startSharedLinksSync,
  'dropbox/data_protection.shared_links.start.sync.requested'
);

describe('startSharedLinksSync', () => {
  test('should fetch team members of the organisation & trigger events to fetch shared links', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
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
      syncStartedAt: now,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();
    expect(step.waitForEvent).toBeCalledTimes(4);

    sharedLinkJobs.forEach((job) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-sync-shared-links`, {
        event: 'dropbox/data_protection.shared_links.sync.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${job.teamMemberId}' && async.data.isPersonal == ${job.isPersonal}`,
      });
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'sync-shared-links',
      sharedLinkJobs.map((sharedLinkJob) => ({
        name: 'dropbox/data_protection.shared_links.sync.requested',
        data: sharedLinkJob,
      }))
    );

    expect(step.sendEvent).toBeCalledWith('start-folder-and-files-sync', {
      data: {
        isFirstSync: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: now,
        cursor: null,
        nangoConnectionId,
        region,
      },
      name: 'dropbox/data_protection.folder_and_files.start.sync.requested',
    });
  });

  test('should retrieve member data, paginate to the next page, and trigger events to fetch shared links', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: nextCursor,
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    expect(step.waitForEvent).toBeCalledTimes(4);

    sharedLinkJobs.forEach((job) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-sync-shared-links`, {
        event: 'dropbox/data_protection.shared_links.sync.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${job.teamMemberId}' && async.data.isPersonal == ${job.isPersonal}`,
      });
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'sync-shared-links',
      sharedLinkJobs.map((sharedLinkJob) => ({
        name: 'dropbox/data_protection.shared_links.sync.requested',
        data: sharedLinkJob,
      }))
    );

    expect(step.sendEvent).toBeCalledWith('start-shared-link-sync', {
      data: {
        isFirstSync: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: now,
        cursor: nextCursor,
        nangoConnectionId,
        region,
      },
      name: 'dropbox/data_protection.shared_links.start.sync.requested',
    });
  });
});
