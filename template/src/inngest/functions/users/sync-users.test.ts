/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `syncUsers` function example.
 * These tests serve as a conceptual framework and are not intended to be used as definitive tests in a production environment.
 * They are meant to illustrate potential test scenarios and methodologies that might be relevant for a SaaS integration.
 * Developers should create their own tests tailored to the specific implementation details and requirements of their SaaS integration.
 * The mock data, assertions, and scenarios used here are simplified and may not cover all edge cases or real-world complexities.
 * It is crucial to expand upon these tests, adapting them to the actual logic and behaviors of your specific SaaS integration.
 */
import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const syncStartedAt = Date.now();

// TODO: Replace with your source-specific user type
const users = Array.from({ length: 5 }, (_, i) => ({
  id: `user-id-${i}`,
  displayName: `User ${i}`,
  email: `user-${i}@example.com`,
}));

const setup = createInngestFunctionMock(syncUsers, 'source/users.sync.requested');

describe('syncUsers', () => {
  test('should continue the sync when there is a next page', async () => {
    // Mock Nango API to return valid credentials
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));

    // TODO: Add your source-specific mocks here
    // Example:
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: 'next-page-token',
    });

    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: 'current-page',
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      name: '{{name}}/users.sync.requested',
      data: {
        organisationId,
        region,
        nangoConnectionId,
        isFirstSync: false,
        syncStartedAt,
        page: 'next-page-token',
      },
    });
  });

  test('should finalize the sync when there is no next page', async () => {
    // Mock Nango API to return valid credentials
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));

    // TODO: Add your source-specific mocks here
    // Example:
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    // Verify no more sync events are sent
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should handle invalid Nango credentials', async () => {
    // Mock Nango API to return invalid credentials
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: {},
      }),
    }));

    const [result] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).rejects.toThrow('Could not retrieve Nango credentials');
  });

  // TODO: Add test cases for your source-specific scenarios
  // Examples:
  // - API errors (400, 401, 403)
  // - Invalid user data
  // - Empty user lists
  // Note: Rate limiting (429) is handled by rate-limit-middleware
});
