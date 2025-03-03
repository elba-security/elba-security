import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import * as nangoAPI from '@/common/nango';
import * as sharedLinkConnector from '@/connectors/dropbox/shared-links';
import { syncSharedLinks } from './sync-shared-links';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const now = Date.now();
const nextCursor = 'next-page-cursor';
const teamMemberId = 'team-member-id-1';

const setupArgs = {
  organisationId,
  teamMemberId,
  isFirstSync: false,
  syncStartedAt: now,
  cursor: null,
  isPersonal: false,
  pathRoot: '10000',
  nangoConnectionId,
  region,
};

const sharedLinks = [
  {
    id: 'id:shared-file-id-3',
    linkAccessLevel: 'viewer',
    pathLower: 'path-1/share-file-3.yaml',
    url: 'https://foo.com/path-1/share-file-3.yaml',
  },
  {
    id: 'id:share-folder-id-4',
    linkAccessLevel: 'viewer',
    pathLower: 'path-2/share-folder-4',
    url: 'https://foo.com/path-2/share-folder-4',
  },
];

const setup = createInngestFunctionMock(
  syncSharedLinks,
  'dropbox/data_protection.shared_links.sync.requested'
);

describe('syncSharedLinks', () => {
  test('should fetch shared links of a member and insert into db & should call the event itself to fetch next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(sharedLinkConnector, 'getSharedLinks').mockResolvedValue({
      links: sharedLinks,
      nextCursor,
    });

    const [result, { step }] = setup(setupArgs);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-shared-links-next-page', {
      data: {
        organisationId,
        isFirstSync: false,
        isPersonal: false,
        syncStartedAt: now,
        teamMemberId: 'team-member-id-1',
        cursor: nextCursor,
        pathRoot: '10000',
        nangoConnectionId,
        region,
      },
      name: 'dropbox/data_protection.shared_links.sync.requested',
    });
  });

  test('should fetch shared links of a member and insert into db & should call the waitFore event', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });

    vi.spyOn(sharedLinkConnector, 'getSharedLinks').mockResolvedValue({
      links: sharedLinks,
      nextCursor: null,
    });

    const [result, { step }] = setup(setupArgs);

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('wait-for-shared-links-to-be-fetched', {
      data: {
        cursor: null,
        isFirstSync: false,
        isPersonal: false,
        organisationId,
        syncStartedAt: now,
        teamMemberId,
        pathRoot: '10000',
        nangoConnectionId,
        region,
      },
      name: 'dropbox/data_protection.shared_links.sync.completed',
    });
  });
});
