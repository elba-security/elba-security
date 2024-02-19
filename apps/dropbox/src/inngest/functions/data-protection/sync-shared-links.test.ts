import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  teamMemberOnceSecondPageWithoutPagination,
  teamMemberOneFirstPage,
} from './__mocks__/shared-links';
import { synchronizeSharedLinks } from './sync-shared-links';
import { insertOrganisations } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';
const teamMemberId = 'team-member-id-1';

const setup = createInngestFunctionMock(
  synchronizeSharedLinks,
  'dropbox/data_protection.shared_links.sync_page.requested'
);

const mocks = vi.hoisted(() => {
  return {
    sharingListSharedLinksMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-access.ts', async () => {
  const dropbox = await vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        sharingListSharedLinks: mocks.sharingListSharedLinksMock,
      };
    }),
  };
});

describe('fetch-shared-links', () => {
  beforeEach(async () => {
    await insertOrganisations();
    vi.clearAllMocks();
    mocks.sharingListSharedLinksMock.mockReset();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  test('should abort sync when organisation is not registered', async () => {
    mocks.sharingListSharedLinksMock.mockResolvedValue({});
    const [result, { step }] = await setup({
      organisationId: '00000000-0000-0000-0000-000000000010',
      teamMemberId: 'team-member-id',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(mocks.sharingListSharedLinksMock).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.sharingListSharedLinksMock.mockRejectedValue(
      new DropboxResponseError(
        429,
        {},
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
            retry_after: RETRY_AFTER,
          },
        }
      )
    );

    const [result] = setup({
      organisationId,
      teamMemberId,
      isPersonal: false,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should fetch shared links of a member and insert into db & should call the event itself to fetch next page', async () => {
    mocks.sharingListSharedLinksMock.mockImplementation(() => {
      return teamMemberOneFirstPage;
    });

    const [result, { step }] = setup({
      organisationId,
      teamMemberId,
      isPersonal: false,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-shared-links', {
      data: {
        isFirstSync: false,
        isPersonal: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        teamMemberId: 'team-member-id-1',
        cursor: 'has-more-cursor',
      },
      name: 'dropbox/data_protection.shared_links.sync_page.requested',
    });
  });

  test('should fetch shared links of a member and insert into db & should call the waitFore event', async () => {
    mocks.sharingListSharedLinksMock.mockImplementation(() => {
      return teamMemberOnceSecondPageWithoutPagination;
    });

    const [result, { step }] = setup({
      organisationId,
      teamMemberId,
      isPersonal: false,
      cursor: 'has-more-cursor',
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('wait-for-shared-links-to-be-fetched', {
      data: {
        cursor: 'has-more-cursor',
        isFirstSync: false,
        isPersonal: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        teamMemberId: 'team-member-id-1',
      },
      name: 'dropbox/data_protection.synchronize_shared_links.sync_page.completed',
    });
  });
});
