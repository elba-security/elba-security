import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { insertOrganisations } from '@/common/__mocks__/token';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { createPathSyncJobs } from './create-path-sync-jobs';
import {
  membersListFirstPageResult,
  membersListWithoutPagination,
} from '../users/__mocks__/dropbox';
import { pathJobEvents } from './__mocks__/path-jobs-events';

const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(
  createPathSyncJobs,
  'data-protection/create-path-sync-jobs'
);

const mocks = vi.hoisted(() => {
  return {
    fetchUsersMockResponse: vi.fn(),
    teamMembersListContinueV2: vi.fn(),
  };
});

// Mock DBXFetcher class
vi.mock('@/repositories/dropbox/clients/DBXFetcher', () => {
  const dropbox = vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXFetcher: vi.fn(() => {
      return {
        fetchUsers: mocks.fetchUsersMockResponse,
      };
    }),
  };
});

describe('run-user-sync-jobs', async () => {
  beforeEach(async () => {
    mocks.fetchUsersMockResponse.mockReset();
  });

  beforeAll(async () => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    await insertOrganisations({
      size: 3,
      expiresAt: [
        new Date('2023-01-10T20:00:00.000Z'), // Expired token
        new Date('2023-01-14T20:00:00.000Z'),
        new Date('2023-01-14T20:00:00.000Z'),
      ],
    });

    mocks.fetchUsersMockResponse.mockRejectedValue(
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

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      pathRoot: 1000,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test('should fetch team members of the organisation & trigger events to synchronize folders and files', async () => {
    mocks.fetchUsersMockResponse.mockImplementation(() => {
      return membersListWithoutPagination;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: false,
      pathRoot: 1000,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      adminTeamMemberId: 'admin-team-member-id-1',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'send-event-synchronize-folders-and-files',
      pathJobEvents
    );
  });

  test('should fetch team members of the organisation & trigger events to synchronize folders and files', async () => {
    mocks.fetchUsersMockResponse.mockImplementation(() => {
      return membersListFirstPageResult;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: false,
      pathRoot: 1000,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      adminTeamMemberId: 'admin-team-member-id-1',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'send-event-synchronize-folders-and-files',
      pathJobEvents
    );

    expect(step.sendEvent).toBeCalledWith('send-event-create-path-sync-jobs', {
      data: {
        accessToken: 'access-token-1',
        cursor: 'cursor-1',
        isFirstScan: false,
        organisationId,
        pathRoot: 1000,
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        adminTeamMemberId: 'admin-team-member-id-1',
      },
      name: 'data-protection/create-path-sync-jobs',
    });
  });
});
