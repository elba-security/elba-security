import { http } from 'msw';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { TypeformConnectionError } from './commons/errors';
import { getUsers, getAuthUser } from './users';
import * as workspacesModule from './workspaces';

const accessToken = 'test-token';

// Mock rate limiter to avoid delays in tests
vi.mock('./commons/rate-limiter', () => ({
  typeformRateLimiter: {
    wait: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch users from all workspaces', async () => {
      vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [
          {
            id: 'workspace-1',
            name: 'Marketing Team',
            forms: [{ href: 'https://api.typeform.com/forms', count: 5 }],
            self: { href: 'https://api.typeform.com/workspaces/workspace-1' },
          },
          {
            id: 'workspace-2',
            name: 'Sales Team',
            forms: [{ href: 'https://api.typeform.com/forms', count: 3 }],
            self: { href: 'https://api.typeform.com/workspaces/workspace-2' },
          },
        ],
        page_count: 1,
        total_items: 2,
      });

      vi.spyOn(workspacesModule, 'getWorkspaceDetails')
        .mockResolvedValueOnce({
          id: 'workspace-1',
          name: 'Marketing Team',
          forms: [{ href: 'https://api.typeform.com/forms', count: 5 }],
          self: { href: 'https://api.typeform.com/workspaces/workspace-1' },
          members: [
            {
              href: 'https://api.typeform.com/users/user1',
              email: 'john@company.com',
              name: 'John Doe',
              role: 'owner',
            },
            {
              href: 'https://api.typeform.com/users/user2',
              email: 'jane@company.com',
              name: 'Jane Smith',
              role: 'member',
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 'workspace-2',
          name: 'Sales Team',
          forms: [{ href: 'https://api.typeform.com/forms', count: 3 }],
          self: { href: 'https://api.typeform.com/workspaces/workspace-2' },
          members: [
            {
              href: 'https://api.typeform.com/users/user3',
              email: 'bob@company.com',
              role: 'member',
            },
          ],
        });

      const result = await getUsers({ accessToken });

      expect(result.validUsers).toHaveLength(3);
      expect(result.validUsers).toEqual([
        {
          email: 'john@company.com',
          name: 'John Doe',
          role: 'owner',
          workspaceId: 'workspace-1',
          workspaceName: 'Marketing Team',
        },
        {
          email: 'jane@company.com',
          name: 'Jane Smith',
          role: 'member',
          workspaceId: 'workspace-1',
          workspaceName: 'Marketing Team',
        },
        {
          email: 'bob@company.com',
          name: undefined,
          role: 'member',
          workspaceId: 'workspace-2',
          workspaceName: 'Sales Team',
        },
      ]);
      expect(result.nextPage).toBeNull();
    });

    it('should handle pagination with batch size limit', async () => {
      const originalBatchSize = env.TYPEFORM_USERS_SYNC_BATCH_SIZE;
      // Override batch size for testing
      Object.defineProperty(env, 'TYPEFORM_USERS_SYNC_BATCH_SIZE', {
        value: 2,
        configurable: true,
      });

      vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [
          { id: 'workspace-1', name: 'Team 1', forms: [], self: { href: '' } },
          { id: 'workspace-2', name: 'Team 2', forms: [], self: { href: '' } },
        ],
        page_count: 1,
        total_items: 2,
      });

      vi.spyOn(workspacesModule, 'getWorkspaceDetails').mockResolvedValue({
        id: 'workspace-1',
        name: 'Team 1',
        forms: [],
        self: { href: '' },
        members: [
          { href: '', email: 'user1@company.com', role: 'member' },
          { href: '', email: 'user2@company.com', role: 'member' },
          { href: '', email: 'user3@company.com', role: 'member' },
        ],
      });

      const result = await getUsers({ accessToken });

      expect(result.validUsers).toHaveLength(2);
      expect(result.nextPage).toBe('1:1'); // Continue from workspace index 1

      // Restore original value
      Object.defineProperty(env, 'TYPEFORM_USERS_SYNC_BATCH_SIZE', {
        value: originalBatchSize,
        configurable: true,
      });
    });

    it('should handle workspaces without members', async () => {
      vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [{ id: 'workspace-1', name: 'Empty Team', forms: [], self: { href: '' } }],
        page_count: 1,
        total_items: 1,
      });

      vi.spyOn(workspacesModule, 'getWorkspaceDetails').mockResolvedValue({
        id: 'workspace-1',
        name: 'Empty Team',
        forms: [],
        self: { href: '' },
        // No members property
      });

      const result = await getUsers({ accessToken });

      expect(result.validUsers).toHaveLength(0);
      expect(result.invalidUsers).toHaveLength(0);
      expect(result.nextPage).toBeNull();
    });

    it('should handle workspace errors gracefully', async () => {
      vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [
          { id: 'workspace-1', name: 'Team 1', forms: [], self: { href: '' } },
          { id: 'workspace-2', name: 'Team 2', forms: [], self: { href: '' } },
        ],
        page_count: 1,
        total_items: 2,
      });

      vi.spyOn(workspacesModule, 'getWorkspaceDetails')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          id: 'workspace-2',
          name: 'Team 2',
          forms: [],
          self: { href: '' },
          members: [{ href: '', email: 'user@company.com', role: 'member' }],
        });

      const result = await getUsers({ accessToken });

      expect(result.validUsers).toHaveLength(1);
      expect(result.invalidUsers).toHaveLength(1);
      expect(result.invalidUsers[0]).toMatchObject({
        workspaceId: 'workspace-1',
        error: 'Network error',
      });
    });

    it('should use EU data center when specified', async () => {
      const getWorkspacesSpy = vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [],
        page_count: 1,
        total_items: 0,
      });

      await getUsers({ accessToken, isEuDataCenter: true });

      expect(getWorkspacesSpy).toHaveBeenCalledWith({
        accessToken,
        page: 1,
        isEuDataCenter: true,
      });
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.TYPEFORM_API_BASE_URL}/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(null, { status: 401 });
          }

          return Response.json({
            alias: 'johndoe',
            email: 'john@company.com',
            language: 'en',
            email_verified: true,
          });
        })
      );
    });

    it('should fetch authenticated user successfully', async () => {
      const result = await getAuthUser(accessToken);

      expect(result).toEqual({
        alias: 'johndoe',
        email: 'john@company.com',
        language: 'en',
        email_verified: true,
      });
    });

    it('should throw on invalid token', async () => {
      await expect(getAuthUser('invalid-token')).rejects.toThrow(
        new TypeformConnectionError('unauthorized', 'Invalid access token')
      );
    });

    it('should use EU API when specified', async () => {
      let capturedUrl: string | undefined;

      server.use(
        http.get(`${env.TYPEFORM_EU_API_BASE_URL}/me`, ({ request }) => {
          capturedUrl = request.url;
          return Response.json({
            alias: 'johndoe',
            email: 'john@company.com',
            language: 'en',
            email_verified: true,
          });
        })
      );

      await getAuthUser(accessToken, true);
      expect(capturedUrl).toContain('api.eu.typeform.com');
    });
  });
});
