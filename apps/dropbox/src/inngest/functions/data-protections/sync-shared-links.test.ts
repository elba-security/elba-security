import { createInngestFunctionMock } from '@elba-security/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import * as crypto from '@/common/crypto';
import { organisationsTable, type Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import * as sharedLinkConnector from '@/connectors/dropbox/shared-links';
import { syncSharedLinks } from './sync-shared-links';

const now = Date.now();
const nextCursor = 'next-page-cursor';
const teamMemberId = 'team-member-id-1';

const organisation: Omit<Organisation, 'createdAt'> = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  adminTeamMemberId: 'admin-team-member-id',
  rootNamespaceId: 'root-namespace-id',
  region: 'us',
};

const setupArgs = {
  organisationId: organisation.id,
  teamMemberId,
  isFirstSync: false,
  syncStartedAt: now,
  cursor: null,
  isPersonal: false,
  pathRoot: '10000',
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
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup(setupArgs);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should fetch shared links of a member and insert into db & should call the event itself to fetch next page', async () => {
    await db.insert(organisationsTable).values(organisation).execute();
    vi.spyOn(sharedLinkConnector, 'getSharedLinks').mockResolvedValue({
      links: sharedLinks,
      nextCursor,
    });

    const [result, { step }] = setup(setupArgs);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-shared-links-next-page', {
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        isPersonal: false,
        syncStartedAt: now,
        teamMemberId: 'team-member-id-1',
        cursor: nextCursor,
        pathRoot: '10000',
      },
      name: 'dropbox/data_protection.shared_links.sync.requested',
    });
  });

  test('should fetch shared links of a member and insert into db & should call the waitFore event', async () => {
    await db.insert(organisationsTable).values(organisation).execute();
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
        organisationId: organisation.id,
        syncStartedAt: now,
        teamMemberId,
        pathRoot: '10000',
      },
      name: 'dropbox/data_protection.shared_links.sync.completed',
    });
  });
});
