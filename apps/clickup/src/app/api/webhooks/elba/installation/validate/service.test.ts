import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spyOnElba } from '@elba-security/test-utils';
import { inngest } from '@/inngest/client';
import * as teamIdsConnector from '@/connectors/clickup/teams';
import * as nangoAPI from '@/common/nango';
import { validateSourceInstallation } from './service';

const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const now = Date.now();

describe('validateSourceInstallation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should send request to sync the users and set the elba connection error null', async () => {
    const elba = spyOnElba();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });

    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    vi.spyOn(teamIdsConnector, 'getTeamIds').mockResolvedValue([
      {
        id: 'team-id-0',
      },
    ]);

    await validateSourceInstallation({
      organisationId,
      nangoConnectionId,
      region,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'clickup/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'clickup/users.sync.requested',
        data: {
          organisationId,
          region,
          nangoConnectionId,
          isFirstSync: true,
          syncStartedAt: now,
          page: null,
        },
      },
    ]);
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      errorType: null,
    });
  });
  it('should throw an error when the nango credentials are not valid', async () => {
    const elba = spyOnElba();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockRejectedValue(new Error('Could not retrieve Nango credentials')),
    });

    await expect(
      validateSourceInstallation({
        organisationId,
        nangoConnectionId,
        region,
      })
    ).resolves.toStrictEqual({
      message: 'Source installation validation failed',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      errorMetadata: {
        name: 'Error',
        cause: undefined,
        message: 'Could not retrieve Nango credentials',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
        stack: expect.any(String),
      },
      errorType: 'unknown',
    });
  });
  it('should throw ClickUpMultipleWorkspaceError when the multiple teams exist', async () => {
    const elba = spyOnElba();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });

    vi.spyOn(teamIdsConnector, 'getTeamIds').mockResolvedValue([
      {
        id: 'team-id-0',
      },
      {
        id: 'team-id-1',
      },
    ]);

    await validateSourceInstallation({
      organisationId,
      nangoConnectionId,
      region,
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      errorMetadata: {
        cause: undefined,
        name: 'ClickUpError',
        message: 'User has selected multiple workspaces',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
        stack: expect.any(String),
      },
      errorType: 'multiple_workspaces_not_supported',
    });
  });
});
