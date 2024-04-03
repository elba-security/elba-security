import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { insertOrganisations } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { membersList } from '../users/__mocks__/dropbox';
import { pathJobEvents } from './__mocks__/path-jobs-events';
import { startFolderAndFileSync } from './start-folders-and-files-sync';

const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';
const syncStartedAt = 1609459200000;

const elbaOptions = {
  baseUrl: 'https://api.elba.io',
  apiKey: 'elba-api-key',
  organisationId,
  region: 'eu',
};

const setup = createInngestFunctionMock(
  startFolderAndFileSync,
  'dropbox/data_protection.folder_and_files.start.sync_page.requested'
);

const mocks = vi.hoisted(() => {
  return {
    teamMembersListV2Mock: vi.fn(),
  };
});

// Mock Dropbox sdk
vi.mock('@/connectors/dropbox/dbx-access.ts', async () => {
  const actual = await vi.importActual('dropbox');
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
    vi.clearAllMocks();
    mocks.teamMembersListV2Mock.mockReset();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
    vi.clearAllMocks();
  });

  test('should abort sync when organisation is not registered', async () => {
    mocks.teamMembersListV2Mock.mockResolvedValue({});
    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000010',
      isFirstSync: false,
      syncStartedAt,
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
      syncStartedAt,
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should fetch team members of the organisation & trigger events to synchronize folders and files', async () => {
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
      isFirstSync: false,
      syncStartedAt,
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-folder-and-files', pathJobEvents);
  });

  test('should fetch team members of the organisation & trigger events to synchronize folders and files', async () => {
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
      isFirstSync: false,
      syncStartedAt,
    });

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('sync-folder-and-files', pathJobEvents);

    expect(step.sendEvent).toBeCalledWith('start-folder-and-files-sync', {
      data: {
        cursor: 'cursor-1',
        isFirstSync: false,
        organisationId,
        syncStartedAt,
      },
      name: 'dropbox/data_protection.folder_and_files.start.sync_page.requested',
    });
  });

  test('should call the elba data protection delete object when all sync jobs created for the organisation', async () => {
    const elba = spyOnElba();
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
      isFirstSync: false,
      syncStartedAt,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith(elbaOptions);

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-folder-and-files', pathJobEvents);

    expect(step.run).toBeCalledTimes(2);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
  });
});
