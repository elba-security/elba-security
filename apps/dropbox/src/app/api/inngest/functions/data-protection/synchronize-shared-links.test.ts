import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { RetryAfterError } from 'inngest';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  teamMemberOnceSecondPageWithoutPagination,
  teamMemberOneFirstPage,
} from './__mocks__/shared-links';
import { synchronizeSharedLinks } from './synchronize-shared-links';

const organisationId = '00000000-0000-0000-0000-000000000001';
const teamMemberId = 'team-member-id-1';

const setup = createInngestFunctionMock(
  synchronizeSharedLinks,
  'data-protection/synchronize-shared-links'
);

const mocks = vi.hoisted(() => {
  return {
    sharingListSharedLinks: vi.fn(),
  };
});

// Mock Dropbox sdk
vi.mock('@/repositories/dropbox/clients/DBXAccess', async () => {
  const dropbox = await vi.importActual('dropbox');

  if (!dropbox || typeof dropbox !== 'object') {
    throw new Error('Expected dropbox to be an object.');
  }

  return {
    ...dropbox,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        sharingListSharedLinks: mocks.sharingListSharedLinks,
      };
    }),
  };
});

describe('fetch-shared-links', () => {
  beforeEach(() => {
    mocks.sharingListSharedLinks.mockReset();
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.sharingListSharedLinks.mockRejectedValue(
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
      teamMemberId,
      pathRoot: '10',
      isPersonal: false,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test('should fetch shared links of a member and insert into db & should call the event itself to fetch next page', async () => {
    mocks.sharingListSharedLinks.mockImplementation(() => {
      return teamMemberOneFirstPage;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      teamMemberId,
      pathRoot: '10',
      isPersonal: false,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('send-event-synchronize-shared-links', {
      data: {
        accessToken: 'access-token-1',
        cursor: 'has-more-cursor',
        isFirstScan: false,
        isPersonal: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        pathRoot: '10',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        teamMemberId: 'team-member-id-1',
      },
      name: 'data-protection/synchronize-shared-links',
    });
  });

  test('should fetch shared links of a member and insert into db & should call the waitFore event', async () => {
    mocks.sharingListSharedLinks.mockImplementation(() => {
      return teamMemberOnceSecondPageWithoutPagination;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      teamMemberId,
      pathRoot: '10',
      isPersonal: false,
      cursor: 'has-more-cursor',
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('wait-for-shared-links-to-be-fetched', {
      data: {
        accessToken: 'access-token-1',
        cursor: undefined,
        isFirstScan: false,
        isPersonal: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        pathRoot: '10',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        teamMemberId: 'team-member-id-1',
      },
      name: 'shared-links/synchronize.shared-links.completed',
    });
  });
});
