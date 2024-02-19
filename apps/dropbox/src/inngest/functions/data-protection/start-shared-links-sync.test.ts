import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { membersList } from '../users/__mocks__/dropbox';
import { sharedLinksEvents } from './__mocks__/shared-links-events';
import { startSharedLinkSync } from './start-shared-links-sync';
import { insertOrganisations } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(
  startSharedLinkSync,
  'dropbox/data_protection.shared_link.start.sync_page.requested'
);

const mocks = vi.hoisted(() => {
  return {
    teamMembersListV2Mock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-access.ts', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamMembersListV2: mocks.teamMembersListV2Mock,
      };
    }),
  };
});

describe('run-user-sync-jobs', () => {
  beforeEach(async () => {
    await insertOrganisations();
    mocks.teamMembersListV2Mock.mockReset();
    vi.clearAllMocks();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  test('should abort sync when organisation is not registered', async () => {
    mocks.teamMembersListV2Mock.mockResolvedValue({});
    const [result, { step }] = await setup({
      organisationId: '00000000-0000-0000-0000-000000000010',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(mocks.teamMembersListV2Mock).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.teamMembersListV2Mock.mockRejectedValue(
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
      isFirstSync: true,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should fetch team members of the organisation & trigger events to fetch shared links', async () => {
    mocks.teamMembersListV2Mock.mockImplementation(() => {
      return {
        result: {
          members: membersList,
          has_more: false,
          cursor: 'cursor-1',
        },
      };
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: true,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.waitForEvent).toBeCalledTimes(6);

    sharedLinksEvents.forEach((link) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-sync-shared-links`, {
        event: 'dropbox/data_protection.synchronize_shared_links.sync_page.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${link.teamMemberId}' && async.data.isPersonal == ${link.isPersonal}`,
      });
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'sync-shared-links',
      sharedLinksEvents.map((sharedLinkJob) => ({
        name: 'dropbox/data_protection.shared_links.sync_page.requested',
        data: sharedLinkJob,
      }))
    );

    expect(step.sendEvent).toBeCalledWith('start-folder-and-files-sync', {
      data: {
        isFirstSync: true,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
      name: 'dropbox/data_protection.folder_and_files.start.sync_page.requested',
    });
  });

  test('should retrieve member data, paginate to the next page, and trigger events to fetch shared links', async () => {
    mocks.teamMembersListV2Mock.mockImplementation(() => {
      return {
        result: {
          members: membersList,
          has_more: true,
          cursor: 'cursor-1',
        },
      };
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: true,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.waitForEvent).toBeCalledTimes(6);

    sharedLinksEvents.forEach((link) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-sync-shared-links`, {
        event: 'dropbox/data_protection.synchronize_shared_links.sync_page.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${link.teamMemberId}' && async.data.isPersonal == ${link.isPersonal}`,
      });
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'sync-shared-links',
      sharedLinksEvents.map((sharedLinkJob) => ({
        name: 'dropbox/data_protection.shared_links.sync_page.requested',
        data: sharedLinkJob,
      }))
    );

    expect(step.sendEvent).toBeCalledWith('start-shared-link-sync', {
      data: {
        isFirstSync: true,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        cursor: 'cursor-1',
      },
      name: 'dropbox/data_protection.shared_link.start.sync_page.requested',
    });
  });
});
