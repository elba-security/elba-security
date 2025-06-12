import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationError } from '@elba-security/common';
import type { AWSConnection, AWSIAMUser, TagMember } from './types';
import { getUsers, getUserTags, deleteUser, validateConnection } from './users';

const credentials: AWSConnection = {
  username: 'AKIAIOSFODNN7EXAMPLE',
  password: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
};

const validUsers: AWSIAMUser[] = [
  {
    UserId: 'AIDACKCEVSQ6C2EXAMPLE1',
    Path: '/',
    UserName: 'john.doe',
    Arn: 'arn:aws:iam::123456789012:user/john.doe',
    CreateDate: '2023-01-01T00:00:00Z',
    PasswordLastUsed: '2024-01-01T00:00:00Z',
  },
  {
    UserId: 'AIDACKCEVSQ6C2EXAMPLE2',
    Path: '/',
    UserName: 'jane.smith',
    Arn: 'arn:aws:iam::123456789012:user/jane.smith',
    CreateDate: '2023-02-01T00:00:00Z',
  },
];

const userTags: Record<string, TagMember[]> = {
  'john.doe': [
    { Key: 'firstName', Value: 'John' },
    { Key: 'lastName', Value: 'Doe' },
    { Key: 'email', Value: 'john.doe@example.com' },
  ],
  'jane.smith': [
    { Key: 'firstName', Value: 'Jane' },
    { Key: 'lastName', Value: 'Smith' },
    { Key: 'email', Value: 'jane.smith@example.com' },
  ],
};

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get('https://iam.amazonaws.com/', ({ request }) => {
          const url = new URL(request.url);
          const action = url.searchParams.get('Action');

          if (action !== 'ListUsers') {
            return new Response(undefined, { status: 400 });
          }

          const authHeader = request.headers.get('Authorization');
          if (!authHeader?.startsWith('AWS4-HMAC-SHA256')) {
            return new Response(undefined, { status: 403 });
          }

          const marker = url.searchParams.get('Marker');
          const isTruncated = !marker;

          return Response.json({
            ListUsersResponse: {
              ListUsersResult: {
                Users: isTruncated ? [validUsers[0]] : [validUsers[1]],
                IsTruncated: isTruncated,
                ...(isTruncated ? { Marker: 'next-marker' } : {}),
              },
            },
          });
        })
      );
    });

    test('should return users and nextMarker when there is another page', async () => {
      const result = await getUsers({ credentials, marker: null });

      expect(result.validUsers).toHaveLength(1);
      expect(result.validUsers[0]).toEqual(validUsers[0]);
      expect(result.invalidUsers).toHaveLength(0);
      expect(result.nextMarker).toBe('next-marker');
    });

    test('should return users and no nextMarker when on last page', async () => {
      const result = await getUsers({ credentials, marker: 'next-marker' });

      expect(result.validUsers).toHaveLength(1);
      expect(result.validUsers[0]).toEqual(validUsers[1]);
      expect(result.invalidUsers).toHaveLength(0);
      expect(result.nextMarker).toBeNull();
    });

    test('should throw when AWS credentials are invalid', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 403 });
        })
      );

      await expect(getUsers({ credentials, marker: null })).rejects.toBeInstanceOf(
        IntegrationError
      );
    });
  });

  describe('getUserTags', () => {
    beforeEach(() => {
      server.use(
        http.get('https://iam.amazonaws.com/', ({ request }) => {
          const url = new URL(request.url);
          const action = url.searchParams.get('Action');
          const userName = url.searchParams.get('UserName');

          if (action !== 'ListUserTags' || !userName) {
            return new Response(undefined, { status: 400 });
          }

          const authHeader = request.headers.get('Authorization');
          if (!authHeader?.startsWith('AWS4-HMAC-SHA256')) {
            return new Response(undefined, { status: 403 });
          }

          const tags = userTags[userName] || [];

          return Response.json({
            ListUserTagsResponse: {
              ListUserTagsResult: {
                Tags: tags,
                IsTruncated: false,
              },
            },
          });
        })
      );
    });

    test('should return user tags successfully', async () => {
      const tags = await getUserTags(credentials, 'john.doe');

      expect(tags).toHaveLength(3);
      expect(tags).toEqual(userTags['john.doe']);
    });

    test('should return empty array for user without tags', async () => {
      const tags = await getUserTags(credentials, 'no-tags-user');

      expect(tags).toHaveLength(0);
    });

    test('should return empty array when request fails', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 403 });
        })
      );

      const tags = await getUserTags(credentials, 'john.doe');
      expect(tags).toHaveLength(0);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.get('https://iam.amazonaws.com/', ({ request }) => {
          const url = new URL(request.url);
          const action = url.searchParams.get('Action');
          const userName = url.searchParams.get('UserName');

          if (action !== 'DeleteUser' || !userName) {
            return new Response(undefined, { status: 400 });
          }

          const authHeader = request.headers.get('Authorization');
          if (!authHeader?.startsWith('AWS4-HMAC-SHA256')) {
            return new Response(undefined, { status: 403 });
          }

          if (userName === 'non-existent-user') {
            return new Response(undefined, { status: 404 });
          }

          return Response.json({
            DeleteUserResponse: {
              ResponseMetadata: {
                RequestId: 'test-request-id',
              },
            },
          });
        })
      );
    });

    test('should delete user successfully', async () => {
      await expect(deleteUser({ credentials, userName: 'john.doe' })).resolves.not.toThrow();
    });

    test('should not throw when user does not exist', async () => {
      await expect(
        deleteUser({ credentials, userName: 'non-existent-user' })
      ).resolves.not.toThrow();
    });

    test('should throw when delete fails with other errors', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 500 });
        })
      );

      await expect(deleteUser({ credentials, userName: 'john.doe' })).rejects.toBeInstanceOf(
        IntegrationError
      );
    });
  });

  describe('validateConnection', () => {
    beforeEach(() => {
      server.use(
        http.get('https://iam.amazonaws.com/', ({ request }) => {
          const url = new URL(request.url);
          const action = url.searchParams.get('Action');

          if (action !== 'ListUsers') {
            return new Response(undefined, { status: 400 });
          }

          const authHeader = request.headers.get('Authorization');
          if (!authHeader?.startsWith('AWS4-HMAC-SHA256')) {
            return new Response(undefined, { status: 403 });
          }

          return Response.json({
            ListUsersResponse: {
              ListUsersResult: {
                Users: [],
                IsTruncated: false,
              },
            },
          });
        })
      );
    });

    test('should validate connection successfully with valid credentials', async () => {
      await expect(validateConnection(credentials)).resolves.not.toThrow();
    });

    test('should throw when credentials are invalid', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 403 });
        })
      );

      await expect(validateConnection(credentials)).rejects.toBeInstanceOf(IntegrationError);
    });
  });
});
