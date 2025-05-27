import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spyOnElba } from '@elba-security/test-utils';
import { inngest } from '@/inngest/client';
import * as usersConnector from '@/connectors/pagerduty/users';
import * as nangoAPI from '@/common/nango';
import { PagerdutyNotAdminError } from '@/connectors/common/error';
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
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
      authUserUrl: 'https://test-url.pagerduty.com',
    });

    await validateSourceInstallation({
      organisationId,
      nangoConnectionId,
      region,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'pagerduty/app.installed',
        data: {
          organisationId,
        },
      },
      {
        name: 'pagerduty/users.sync.requested',
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

  it('should throw an error when when auth user is not an Owner or Admin', async () => {
    const elba = spyOnElba();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });

    vi.spyOn(usersConnector, 'getAuthUser').mockRejectedValue(new PagerdutyNotAdminError(''));

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
        name: 'PagerdutyError',
        cause: undefined,
        message: '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
        stack: expect.any(String),
      },
      errorType: 'not_admin',
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
});
