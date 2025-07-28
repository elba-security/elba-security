import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
import type { MiroUser } from './users';
import { getUsers, getTokenInfo } from './users';

const validToken = 'valid-token-1234';
const orgId = 'test-org-123';

const validMiroUsers: MiroUser[] = [
  { id: 'user-1', email: 'user1@example.com' },
  { id: 'user-2', email: 'user2@example.com' },
  { id: 'user-3', email: 'user3@example.com' },
];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.MIRO_API_BASE_URL}/v2/orgs/:orgId/members`, ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const cursor = url.searchParams.get('cursor');
          const active = url.searchParams.get('active');
          const limit = url.searchParams.get('limit');

          expect(params.orgId).toBe(orgId);
          expect(active).toBe('true');
          expect(limit).toBe(String(env.MIRO_USERS_SYNC_BATCH_SIZE));

          if (cursor === 'page-2') {
            return Response.json({
              data: [validMiroUsers[2]],
              cursor: undefined,
            });
          }

          return Response.json({
            data: [validMiroUsers[0], validMiroUsers[1]],
            cursor: 'page-2',
          });
        })
      );
    });

    test('should return users and nextPage when there is another page', async () => {
      await expect(getUsers({ accessToken: validToken, orgId, page: null })).resolves.toStrictEqual(
        {
          validUsers: [validMiroUsers[0], validMiroUsers[1]],
          invalidUsers: [],
          nextPage: 'page-2',
        }
      );
    });

    test('should return users and no nextPage when on last page', async () => {
      await expect(
        getUsers({ accessToken: validToken, orgId, page: 'page-2' })
      ).resolves.toStrictEqual({
        validUsers: [validMiroUsers[2]],
        invalidUsers: [],
        nextPage: null,
      });
    });

    test('should separate valid and invalid users', async () => {
      server.use(
        http.get(`${env.MIRO_API_BASE_URL}/v2/orgs/:orgId/members`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: [
              { id: 'user-1', email: 'valid@example.com' },
              { id: 'user-2', email: 'invalid-email' }, // Invalid email
              { email: 'missing-id@example.com' }, // Missing id
              { id: '', email: 'empty-id@example.com' }, // Empty id
            ],
          });
        })
      );

      await expect(getUsers({ accessToken: validToken, orgId, page: null })).resolves.toStrictEqual(
        {
          validUsers: [{ id: 'user-1', email: 'valid@example.com' }],
          invalidUsers: [
            { id: 'user-2', email: 'invalid-email' },
            { email: 'missing-id@example.com' },
            { id: '', email: 'empty-id@example.com' },
          ],
          nextPage: null,
        }
      );
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(getUsers({ accessToken: 'invalid-token', orgId, page: null })).rejects.toThrow(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationError on other errors', async () => {
      server.use(
        http.get(`${env.MIRO_API_BASE_URL}/v2/orgs/:orgId/members`, () => {
          return new Response('Internal Server Error', { status: 500 });
        })
      );

      await expect(getUsers({ accessToken: validToken, orgId, page: null })).rejects.toThrow(
        IntegrationError
      );
    });
  });

  describe('getTokenInfo', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.MIRO_API_BASE_URL}/v1/oauth-token`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            organization: {
              id: orgId,
            },
          });
        })
      );
    });

    test('should return organization id for valid token', async () => {
      await expect(getTokenInfo(validToken)).resolves.toBe(orgId);
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(getTokenInfo('invalid-token')).rejects.toThrow(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationError on invalid response structure', async () => {
      server.use(
        http.get(`${env.MIRO_API_BASE_URL}/v1/oauth-token`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            invalidField: 'invalid-value',
          });
        })
      );

      await expect(getTokenInfo(validToken)).rejects.toThrow(IntegrationError);
    });

    test('should throw IntegrationError on server error', async () => {
      server.use(
        http.get(`${env.MIRO_API_BASE_URL}/v1/oauth-token`, () => {
          return new Response('Internal Server Error', { status: 500 });
        })
      );

      await expect(getTokenInfo(validToken)).rejects.toThrow(IntegrationError);
    });
  });
});
