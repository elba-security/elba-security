import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { ServiceError } from '../common/error';
import type { SourceUser } from './users';
import { getAuthUser, getUsers } from './users';

// Test data setup
const validToken = 'valid-token-1234';
const nextUri = `${env.SOURCE_API_BASE_URL}/users?page=2`; // Example pagination URL
const endPosition = '2'; // Used to determine when to stop pagination

// Create sample valid users for testing
// Modify the structure to match your source API's user format
const validUsers: SourceUser[] = Array.from({ length: 5 }, (_, i) => ({
  user: {
    id: `user-${i}`,
    name: `User ${i}`,
    type: 'user',
  },
  metadata: {
    department: `Department ${i}`,
  },
}));

// Keep track of invalid users for testing error cases
const invalidUsers: unknown[] = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      // Set up MSW to intercept API calls
      // This mocks your source API's user endpoint
      server.use(
        http.get(`${env.SOURCE_API_BASE_URL}/users`, ({ request }) => {
          // Validate the access token
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          // Handle pagination
          const url = new URL(request.url);
          const position = url.searchParams.get('page');

          // Prepare the response data
          // Modify this structure to match your source API's response format
          const responseData = {
            users: validUsers,
            pagination: {
              // Include next page URL if not at the end
              ...(position !== endPosition ? { nextPage: nextUri } : {}),
            },
          };

          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and there is another page', async () => {
      // Test the initial page of results
      await expect(getUsers({ accessToken: validToken, page: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextUri,
      });
    });

    test('should return users and no nextPage when the token is valid and there is no other page', async () => {
      // Test the final page of results
      await expect(
        getUsers({
          accessToken: validToken,
          page: nextUri,
        })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throw when the token is invalid', async () => {
      // Test error handling for invalid authentication
      await expect(getUsers({ accessToken: 'invalid-token' })).rejects.toBeInstanceOf(ServiceError);
    });

    // TODO: Add more test cases specific to your source API
    // Examples:
    // - Test handling of malformed user data
    // - Test filtering of non-user types
    // - Test handling of API-specific error responses
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      // Set up MSW to intercept authenticated user endpoint
      server.use(
        http.get(`${env.SOURCE_API_BASE_URL}/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          // Return a sample authenticated user
          // Modify this to match your source API's user format
          return Response.json({
            id: 'auth-user-1',
            name: 'Authenticated User',
            type: 'user',
          });
        })
      );
    });

    test('should successfully retrieve and parse user data', async () => {
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        id: 'auth-user-1',
        name: 'Authenticated User',
        type: 'user',
      });
    });

    test('should throw when the token is invalid', async () => {
      await expect(getAuthUser('invalid-token')).rejects.toBeInstanceOf(ServiceError);
    });

    // TODO: Add more test cases for authentication scenarios
    // Examples:
    // - Test handling of users with insufficient permissions
    // - Test handling of expired tokens
    // - Test handling of malformed user data
  });
});
