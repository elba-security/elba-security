import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { RetryAfterError } from 'inngest';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { insertTestAccessToken } from '@/common/__mocks__/token';
import { membersListFirstPageResult, membersListWithoutPagination } from './__mocks__/dropbox';
import { runUserSyncJobs } from './run-user-sync-jobs';

const organisationId = '00000000-0000-0000-0000-000000000001';
const syncStartedAt = '2021-09-01T00:00:00.000Z';

const setup = createInngestFunctionMock(runUserSyncJobs, 'users/run-user-sync-jobs');

const mocks = vi.hoisted(() => {
  return {
    teamMembersListV2: vi.fn(),
    teamMembersListContinueV2: vi.fn(),
  };
});

// Mock Dropbox sdk
vi.mock('@/repositories/dropbox/clients/DBXAccess', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamMembersListV2: mocks.teamMembersListV2,
        teamMembersListContinueV2: mocks.teamMembersListContinueV2,
      };
    }),
  };
});

describe('run-user-sync-jobs', () => {
  beforeEach(() => {
    mocks.teamMembersListV2.mockReset();
    mocks.teamMembersListContinueV2.mockReset();
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.teamMembersListV2.mockRejectedValue(
      new DropboxResponseError(
        429,
        {
          'Retry-After': '5',
        },
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
          },
        }
      )
    );

    await insertTestAccessToken();
    const [result] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      syncStartedAt,
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test('should call elba delete even if the user length is 0', async () => {
    mocks.teamMembersListV2.mockImplementation(() => {
      return {
        result: {
          members: [],
          has_more: false,
        },
      };
    });

    const [result] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      success: true,
    });
  });

  test('should fetch member data and appropriately send it to Elba', async () => {
    mocks.teamMembersListV2.mockImplementation(() => {
      return membersListWithoutPagination;
    });

    const [result] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      success: true,
    });
  });

  test("should retrieve member data, paginate to the next page, and forward it to 'elba' as appropriate", async () => {
    mocks.teamMembersListV2.mockImplementation(() => {
      return membersListFirstPageResult;
    });

    const [result] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      success: true,
    });
  });
});
