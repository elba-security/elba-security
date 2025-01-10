import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spyOnElba } from '@elba-security/test-utils';
import { inngest } from '@/inngest/client';
import * as usersConnector from '@/connectors/datadog/users';
import * as nangoAPI from '@/common/nango';
import { validateSourceInstallation } from './service';

const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const now = Date.now();
const apiKey = 'test-access-token';
const appKey = 'test-appKey';
const siteParameter = 'datadoghq.eu';

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
        credentials: { apiKey },
        connection_config: {
          applicationKey: appKey,
          siteParameter,
        },
      }),
    });

    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
      authUserId: 'auth-user-id',
    });

    await validateSourceInstallation({
      organisationId,
      nangoConnectionId,
      region,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'datadog/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'datadog/users.sync.requested',
        data: {
          organisationId,
          region,
          nangoConnectionId,
          isFirstSync: true,
          syncStartedAt: now,
          page: 0,
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
      getConnection: vi.fn().mockResolvedValue({
        credentials: {},
      }),
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
});
