import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { insertOrganisations, insertTestAccessToken } from '@/common/__mocks__/token';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { createSharedLinkSyncJobs } from './create-shared-link-sync-jobs';
import {
  membersListFirstPageResult,
  membersListWithoutPagination,
} from '../users/__mocks__/dropbox';
import { sharedLinksEvents } from './__mocks__/shared-links-events';

const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(
  createSharedLinkSyncJobs,
  'data-protection/create-shared-link-sync-jobs'
);

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
        setHeaders: vi.fn(() => {}),
        teamMembersListV2: mocks.teamMembersListV2,
        teamMembersListContinueV2: mocks.teamMembersListContinueV2,
      };
    }),
  };
});

describe('run-user-sync-jobs', async () => {
  beforeEach(async () => {
    mocks.teamMembersListV2.mockReset();
    mocks.teamMembersListContinueV2.mockReset();
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

  test('should fetch team members of the organisation & trigger events to fetch shared links', async () => {
    mocks.teamMembersListV2.mockImplementation(() => {
      return membersListWithoutPagination;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      pathRoot: 1000,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
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

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'send-event-fetch-shared-links',
      sharedLinksEvents.map((sharedLinkJob) => ({
        name: 'data-protection/fetch-shared-links',
        data: sharedLinkJob,
      }))
    );
  });

  test.only('should retrieve member data, paginate to the next page, and trigger events to fetch shared links', async () => {
    mocks.teamMembersListV2.mockImplementation(() => {
      return membersListFirstPageResult;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      isFirstScan: true,
      pathRoot: 1000,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
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
      'send-event-fetch-shared-links',
      sharedLinksEvents.map((sharedLinkJob) => ({
        name: 'data-protection/fetch-shared-links',
        data: sharedLinkJob,
      }))
    );

    expect(step.sendEvent).toBeCalledWith('send-event-run-sync-jobs', {
      data: {
        accessToken: 'access-token-1',
        isFirstScan: true,
        organisationId,
        pagination: 'cursor-1',
      },
      name: 'data-protection/run-sync-job',
    });
  });
});
