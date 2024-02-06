import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { insertOrganisations, insertTestAccessToken } from '@/test-utils/token';
import { elbaUsers, membersList } from './__mocks__/dropbox';
import { syncUserPage } from './sync-user-page';
import * as crypto from '@/common/crypto';

const organisationId = '00000000-0000-0000-0000-000000000001';
const syncStartedAt = 1707068979946;

const setup = createInngestFunctionMock(syncUserPage, 'dropbox/users.sync_page.triggered');

const mocks = vi.hoisted(() => {
  return {
    teamMembersListV2: vi.fn(),
    teamMembersListContinueV2: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-access', () => {
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
  beforeEach(async () => {
    await insertOrganisations({});
    vi.clearAllMocks();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.resetModules();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.teamMembersListV2.mockRejectedValue(
      new DropboxResponseError(
        429,
        {},
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
      isFirstSync: true,
      syncStartedAt,
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should call elba delete even when there are no users', async () => {
    const elba = spyOnElba();
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
      isFirstSync: true,
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      status: 'completed',
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('access-token-1');
    expect(elbaInstance?.users.update).toBeCalledTimes(0);
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });

  test('should fetch member data and forward it to elba', async () => {
    const elba = spyOnElba();
    mocks.teamMembersListV2.mockImplementation(() => {
      return {
        result: {
          members: membersList,
          has_more: false,
          cursor: 'cursor-1',
        },
      };
    });

    const [result] = setup({
      organisationId,
      isFirstSync: true,
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      status: 'completed',
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      region: 'eu',
    });
    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith(elbaUsers);
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });

  test('should retrieve member data, paginate to the next page, and forward it to Elba', async () => {
    const elba = spyOnElba();
    mocks.teamMembersListV2.mockImplementation(() => {
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
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      status: 'completed',
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith(elbaUsers);
    expect(elbaInstance?.users.delete).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('run-user-sync-job', {
      name: 'dropbox/users.sync_page.triggered',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt,
        cursor: 'cursor-1',
      },
    });
  });
});
