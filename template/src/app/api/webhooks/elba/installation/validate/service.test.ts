import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spyOnElba } from '@elba-security/test-utils';
import { inngest } from '@/inngest/client';
import * as nangoAPI from '@/common/nango';
import { validateSourceInstallation } from './service';

// Constants used across test cases
const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const now = Date.now();

describe('validateSourceInstallation', () => {
  // Set up consistent timestamp for predictable test assertions
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should send request to sync the users and set the elba connection error null', async () => {
    // Set up Elba client mock using the test utility
    const elba = spyOnElba();

    // Mock Nango API to return valid credentials
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });

    // Mock Inngest event sending
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    // TODO: Add your source-specific validation here
    // Your integration should validate access to your API. For example, Bitbucket:
    // 1. Validates user access:
    //    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
    //      uuid: 'auth-user-id',
    //      display_name: 'test-display-name',
    //      type: 'user',
    //    });
    // 2. Validates workspace access:
    //    vi.spyOn(workspacesConnector, 'getWorkspaces').mockResolvedValue([
    //      {
    //        uuid: 'test-uuid',
    //        name: 'test-name',
    //      },
    //    ]);
    // Your validation might include:
    // - Checking user permissions
    // - Verifying API key/token validity
    // - Testing access to required endpoints

    await validateSourceInstallation({
      organisationId,
      nangoConnectionId,
      region,
    });

    // Verify Inngest events are sent with correct data
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: expect.stringContaining('app.installed'),
        data: {
          organisationId,
        },
      },
      {
        name: expect.stringContaining('users.sync.requested'),
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

    // Verify Elba connection status is updated
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      errorType: null,
    });
  });

  it('should throw an error when the nango credentials are not valid', async () => {
    const elba = spyOnElba();
    // Mock Nango API to return invalid credentials
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

    // Verify error is properly reported to Elba
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

  // TODO: Add test cases for your source-specific validation
  // Your integration should test:
  // 1. API-specific errors:
  //    - Invalid API keys/tokens
  //    - Missing permissions (e.g., 403 responses)
  //    - Malformed API responses
  // 2. Edge cases:
  //    - Empty responses
  //    - Unexpected data formats
  //    - API version mismatches
  // Note: Rate limiting (429) is handled automatically by rate-limit-middleware
});
