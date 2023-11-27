import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { DropboxResponseError } from 'dropbox';
import { mockInngestFunction } from '@/common/__mocks__/inngest';
import { runUserSyncJobPagination } from './run-user-sync-jobs-pagination';
import { membersListSecondPageResult } from './__mocks__/dropbox';

const mocks = vi.hoisted(() => {
  return {
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
        setHeaders: vi.fn(() => {}),
        teamMembersListContinueV2: mocks.teamMembersListContinueV2,
      };
    }),
  };
});

describe('run-user-sync-jobs', async () => {
  beforeEach(async () => {
    mocks.teamMembersListContinueV2.mockReset();
  });

  beforeAll(async () => {
    vi.clearAllMocks();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.teamMembersListContinueV2.mockRejectedValue(
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

    const { result } = mockInngestFunction(runUserSyncJobPagination, {
      organisationId: 'b0771747-caf0-487d-a885-5bc3f1e9f770',
      accessToken: 'access-token-1',
      isFirstScan: true,
      pagination: 'cursor-1',
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test.only("should retrieve member data, paginate to the next page, and forward it to 'elba' as appropriate", async () => {
    mocks.teamMembersListContinueV2.mockImplementationOnce(() => {
      return membersListSecondPageResult;
    });

    const { result } = mockInngestFunction(runUserSyncJobPagination, {
      organisationId: 'b0771747-caf0-487d-a885-5bc3f1e9f770',
      accessToken: 'access-token-1',
      isFirstScan: true,
    });

    expect(await result).toStrictEqual({
      success: true,
    });
  });
});
