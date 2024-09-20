import { createInngestFunctionMock } from '@elba-security/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import * as crypto from '@/common/crypto';
import * as usersConnector from '@/connectors/dropbox/users';
import { encrypt } from '@/common/crypto';
import { organisationsTable, type Organisation } from '@/database/schema';
import { db } from '@/database/client';
import { startSharedLinksSync } from './start-shared-links-sync';

const now = Date.now();

const syncStartedAt = Date.now();
const nextCursor = 'next-page-cursor';

const organisation: Omit<Organisation, 'createdAt'> = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
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

const jobArgs = {
  organisationId: organisation.id,
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
    },
    {
      ...jobArgs,
      teamMemberId: profile.team_member_id,
      isPersonal: true,
      pathRoot: null,
      cursor: null,
    },
  ];
});

const setup = createInngestFunctionMock(
  startSharedLinksSync,
  'dropbox/data_protection.shared_links.start.sync.requested'
);

describe('startSharedLinksSync', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
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

  test('should fetch team members of the organisation & trigger events to fetch shared links', async () => {
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
    });

    await expect(result).resolves.toBeUndefined();
    expect(step.waitForEvent).toBeCalledTimes(4);

    sharedLinkJobs.forEach((job) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-sync-shared-links`, {
        event: 'dropbox/data_protection.shared_links.sync.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisation.id}' && async.data.teamMemberId == '${job.teamMemberId}' && async.data.isPersonal == ${job.isPersonal}`,
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
      },
      name: 'dropbox/data_protection.folder_and_files.start.sync.requested',
    });
  });

  test('should retrieve member data, paginate to the next page, and trigger events to fetch shared links', async () => {
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      cursor: nextCursor,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    expect(step.waitForEvent).toBeCalledTimes(4);

    sharedLinkJobs.forEach((job) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-sync-shared-links`, {
        event: 'dropbox/data_protection.shared_links.sync.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisation.id}' && async.data.teamMemberId == '${job.teamMemberId}' && async.data.isPersonal == ${job.isPersonal}`,
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
      },
      name: 'dropbox/data_protection.shared_links.start.sync.requested',
    });
  });
});
