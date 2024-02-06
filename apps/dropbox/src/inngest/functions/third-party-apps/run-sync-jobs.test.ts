import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DropboxResponseError } from 'dropbox';
import * as crypto from '@/common/crypto';
import { linkedApps, membersLinkedAppFirstPage } from './__mocks__/member-linked-apps';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { insertOrganisations } from '@/test-utils/token';
import { runThirdPartyAppsSyncJobs } from './run-sync-jobs';
import { db } from '@/database/client';
import { organisations } from '@/database';

const organisationId = '00000000-0000-0000-0000-000000000001';
const sourceId = '00000000-0000-0000-0000-000000000008';

const mocks = vi.hoisted(() => {
  return {
    teamLinkedAppsListMembersLinkedAppsMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-access', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamLinkedAppsListMembersLinkedApps: mocks.teamLinkedAppsListMembersLinkedAppsMock,
      };
    }),
  };
});

const setup = createInngestFunctionMock(
  runThirdPartyAppsSyncJobs,
  'third-party-apps/run-sync-jobs'
);

describe('run-user-sync-jobs', () => {
  beforeEach(async () => {
    await db.delete(organisations);
    await insertOrganisations({});
    vi.clearAllMocks();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockRejectedValue(
      new DropboxResponseError(
        429,
        {},
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
            retry_after: 300,
          },
        }
      )
    );

    const [result] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test("should not retry when the organisation's access token expired", async () => {
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockRejectedValue(
      new DropboxResponseError(
        401,
        {},
        {
          error_summary: 'expired_access_token/...',
          error: {
            '.tag': 'expired_access_token',
          },
        }
      )
    );

    const [result] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should call elba delete event if the members apps length is 0', async () => {
    const elba = spyOnElba();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          apps: [],
          has_more: false,
        },
      };
    });

    const [result] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      sourceId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: '2021-01-01T00:00:00.000Z',
    });
  });

  test('should fetch members apps send it to elba(without pagination)', async () => {
    const elba = spyOnElba();
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          cursor: 'cursor-1',
          has_more: false,
          apps: membersLinkedAppFirstPage,
        },
      };
    });

    const [result] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      sourceId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith(linkedApps);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: '2021-01-01T00:00:00.000Z',
    });
  });

  test('should fetch members apps send it tp elba(with pagination)', async () => {
    const elba = spyOnElba();
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          cursor: 'cursor-1',
          has_more: true,
          apps: membersLinkedAppFirstPage,
        },
      };
    });

    const [result, { step }] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      sourceId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('third-party-apps-run-sync-jobs', {
      name: 'third-party-apps/run-sync-jobs',
      data: {
        cursor: 'cursor-1',
        isFirstSync: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
    });

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith(linkedApps);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(0);
  });
});
