import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { synchronizeSharedLinks } from './synchronize-shared-links';
import {
  teamMemberOnceSecondPageWithoutPagination,
  teamMemberOneFirstPage,
} from './__mocks__/shared-links';

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
vi.mock('@/repositories/dropbox/clients/DBXAccess', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(() => {}),
        sharingListSharedLinks: mocks.sharingListSharedLinks,
      };
    }),
  };
});

describe('fetch-shared-links', async () => {
  beforeEach(async () => {
    mocks.sharingListSharedLinks.mockReset();
  });

  beforeAll(async () => {
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

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      teamMemberId,
      pathRoot: 10,
      isPersonal: false,
      pagination: 'has-more-cursor',
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
      pathRoot: 10,
      isPersonal: false,
      pagination: 'has-more-cursor',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('send-event-fetch-shared-links', {
      data: {
        accessToken: 'access-token-1',
        isFirstScan: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        pagination: 'has-more-cursor',
        pathRoot: '000000',
        teamMemberId: 'team-member-id-1',
      },
      name: 'data-protection/synchronize-shared-links',
    });
  });

  test.only('should fetch shared links of a member and insert into db & should call the waitFore event', async () => {
    mocks.sharingListSharedLinks.mockImplementation(() => {
      return teamMemberOnceSecondPageWithoutPagination;
    });

    const [result, { step }] = setup({
      organisationId,
      accessToken: 'access-token-1',
      teamMemberId,
      pathRoot: 10,
      isPersonal: false,
      pagination: 'has-more-cursor',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('wait-for-shared-links-to-be-fetched', {
      data: {
        isPersonal: undefined,
        organisationId: '00000000-0000-0000-0000-000000000001',
        teamMemberId: 'team-member-id-1',
      },
      name: 'shared-links/synchronize.shared-links.completed',
    });
  });
});
