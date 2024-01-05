import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { RetryAfterError } from 'inngest';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { insertOrganisations } from '@/common/__mocks__/token';
import {
  membersListFirstPageResult,
  membersListWithoutPagination,
} from '../users/__mocks__/dropbox';
import { sharedLinksEvents } from './__mocks__/shared-links-events';
import { createSharedLinkSyncJobs } from './create-shared-link-sync-jobs';

const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(
  createSharedLinkSyncJobs,
  'data-protection/create-shared-link-sync-jobs'
);

const mocks = vi.hoisted(() => {
  return {
    fetchUsersMockResponse: vi.fn(),
    teamMembersListContinueV2: vi.fn(),
  };
});

// Mock DBXFetcher class
vi.mock('@/repositories/dropbox/clients/DBXFetcher', async () => {
  const dropbox = await vi.importActual('dropbox');

  if (!dropbox || typeof dropbox !== 'object') {
    throw new Error('Expected dropbox to be an object.');
  }

  return {
    ...dropbox,
    DBXFetcher: vi.fn(() => {
      return {
        fetchUsers: mocks.fetchUsersMockResponse,
      };
    }),
  };
});

describe('run-user-sync-jobs', () => {
  beforeEach(() => {
    mocks.fetchUsersMockResponse.mockReset();
  });

  beforeAll(() => {
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

    const [result] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      pathRoot: '1000',
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
      adminTeamMemberId: 'admin-team-member-id-1',
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test.only('should fetch team members of the organisation & trigger events to fetch shared links', async () => {
    mocks.fetchUsersMockResponse.mockImplementation(() => {
      return membersListWithoutPagination;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      pathRoot: '1000',
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
      adminTeamMemberId: 'admin-team-member-id-1',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.waitForEvent).toBeCalledTimes(6);

    sharedLinksEvents.forEach((link) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-for-shared-links-to-be-fetched`, {
        event: 'shared-links/synchronize.shared-links.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${link.teamMemberId}' && async.data.isPersonal == ${link.isPersonal}`,
      });
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'send-event-synchronize-shared-links',
      expect.arrayContaining(
        sharedLinksEvents.map((sharedLinkJob) => ({
          name: 'data-protection/synchronize-shared-links',
          data: sharedLinkJob,
        }))
      )
    );

    expect(step.sendEvent).toBeCalledWith('send-event-create-path-sync-jobs', {
      name: 'data-protection/create-path-sync-jobs',
      data: {
        accessToken: 'access-token-1',
        adminTeamMemberId: undefined,
        isFirstScan: true,
        organisationId: '00000000-0000-0000-0000-000000000001',
        pathRoot: '1000',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
    });
  });

  test('should retrieve member data, paginate to the next page, and trigger events to fetch shared links', async () => {
    mocks.fetchUsersMockResponse.mockImplementation(() => {
      return membersListFirstPageResult;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      pathRoot: '1000',
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
      adminTeamMemberId: 'admin-team-member-id-1',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.waitForEvent).toBeCalledTimes(6);

    sharedLinksEvents.forEach((link) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-for-shared-links-to-be-fetched`, {
        event: 'shared-links/synchronize.shared-links.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${link.teamMemberId}' && async.data.isPersonal == ${link.isPersonal}`,
      });
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'send-event-synchronize-shared-links',
      expect.arrayContaining(
        sharedLinksEvents.map((sharedLinkJob) => ({
          name: 'data-protection/synchronize-shared-links',
          data: sharedLinkJob,
        }))
      )
    );

    expect(step.sendEvent).toBeCalledWith('send-shared-link-sync-jobs', {
      data: {
        accessToken: 'access-token-1',
        cursor: 'cursor-1',
        isFirstScan: true,
        organisationId: '00000000-0000-0000-0000-000000000001',
        pathRoot: '1000',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
      name: 'data-protection/create-shared-link-sync-jobs',
    });
  });
});
