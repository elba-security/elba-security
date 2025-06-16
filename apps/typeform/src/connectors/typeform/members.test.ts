import { http } from 'msw';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { removeUserFromAllWorkspaces } from './members';
import * as workspacesModule from './workspaces';

const accessToken = 'test-token';
const userEmail = 'user@company.com';

// Mock rate limiter
vi.mock('./commons/rate-limiter', () => ({
  typeformRateLimiter: {
    wait: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('members connector', () => {
  describe('removeUserFromAllWorkspaces', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should remove user from all workspaces they belong to', async () => {
      vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [
          { id: 'workspace-1', name: 'Team 1', forms: { count: 0, href: '' }, self: { href: '' } },
          { id: 'workspace-2', name: 'Team 2', forms: { count: 0, href: '' }, self: { href: '' } },
        ],
        page_count: 1,
        total_items: 2,
      });

      vi.spyOn(workspacesModule, 'getWorkspaceDetails')
        .mockResolvedValueOnce({
          id: 'workspace-1',
          name: 'Team 1',
          forms: { count: 0, href: '' },
          self: { href: '' },
          members: [
            { id: 'member-1', email: userEmail, name: 'User Name', role: 'member' },
            { id: 'member-2', email: 'other@company.com', name: 'Other User', role: 'owner' },
          ],
        })
        .mockResolvedValueOnce({
          id: 'workspace-2',
          name: 'Team 2',
          forms: { count: 0, href: '' },
          self: { href: '' },
          members: [
            { id: 'member-3', email: 'other@company.com', name: 'Other User', role: 'member' },
          ],
        });

      const patchRequests: { workspaceId: string; body: unknown }[] = [];

      server.use(
        http.patch(
          `${env.TYPEFORM_API_BASE_URL}/workspaces/:workspaceId`,
          async ({ request, params }) => {
            const body: unknown = await request.json();
            patchRequests.push({
              workspaceId: params.workspaceId as string,
              body,
            });
            return new Response(null, { status: 200 });
          }
        )
      );

      await removeUserFromAllWorkspaces({ accessToken, userEmail });

      // Should only patch workspace-1 where the user is a member
      expect(patchRequests).toHaveLength(1);
      expect(patchRequests[0]).toEqual({
        workspaceId: 'workspace-1',
        body: [
          {
            op: 'remove',
            path: '/members',
            value: { email: userEmail },
          },
        ],
      });
    });

    it('should handle case-insensitive email matching', async () => {
      vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [
          { id: 'workspace-1', name: 'Team 1', forms: { count: 0, href: '' }, self: { href: '' } },
        ],
        page_count: 1,
        total_items: 1,
      });

      vi.spyOn(workspacesModule, 'getWorkspaceDetails').mockResolvedValue({
        id: 'workspace-1',
        name: 'Team 1',
        forms: { count: 0, href: '' },
        self: { href: '' },
        members: [{ id: 'member-1', email: 'USER@COMPANY.COM', name: 'User Name', role: 'member' }],
      });

      const patchRequests: { workspaceId: string }[] = [];

      server.use(
        http.patch(`${env.TYPEFORM_API_BASE_URL}/workspaces/:workspaceId`, ({ params }) => {
          patchRequests.push({
            workspaceId: params.workspaceId as string,
          });
          return new Response(null, { status: 200 });
        })
      );

      await removeUserFromAllWorkspaces({
        accessToken,
        userEmail: 'user@company.com', // lowercase email
      });

      expect(patchRequests).toHaveLength(1);
      expect(patchRequests[0]?.workspaceId).toBe('workspace-1');
    });

    it('should continue processing if one workspace fails', async () => {
      vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [
          { id: 'workspace-1', name: 'Team 1', forms: { count: 0, href: '' }, self: { href: '' } },
          { id: 'workspace-2', name: 'Team 2', forms: { count: 0, href: '' }, self: { href: '' } },
        ],
        page_count: 1,
        total_items: 2,
      });

      vi.spyOn(workspacesModule, 'getWorkspaceDetails').mockResolvedValue({
        id: 'workspace-1',
        name: 'Team 1',
        forms: { count: 0, href: '' },
        self: { href: '' },
        members: [{ id: 'member-1', email: userEmail, name: 'User Name', role: 'member' }],
      });

      const patchRequests: string[] = [];

      server.use(
        http.patch(`${env.TYPEFORM_API_BASE_URL}/workspaces/:workspaceId`, ({ params }) => {
          const workspaceId = params.workspaceId as string;
          patchRequests.push(workspaceId);

          if (workspaceId === 'workspace-1') {
            return new Response(null, { status: 500 }); // Simulate error
          }
          return new Response(null, { status: 200 });
        })
      );

      // Should not throw
      await expect(removeUserFromAllWorkspaces({ accessToken, userEmail })).resolves.not.toThrow();

      expect(patchRequests).toContain('workspace-1');
    });

    it('should handle pagination', async () => {
      vi.spyOn(workspacesModule, 'getWorkspaces')
        .mockResolvedValueOnce({
          items: [
            {
              id: 'workspace-1',
              name: 'Team 1',
              forms: { count: 0, href: '' },
              self: { href: '' },
            },
          ],
          page_count: 2,
          total_items: 2,
        })
        .mockResolvedValueOnce({
          items: [
            {
              id: 'workspace-2',
              name: 'Team 2',
              forms: { count: 0, href: '' },
              self: { href: '' },
            },
          ],
          page_count: 2,
          total_items: 2,
        });

      vi.spyOn(workspacesModule, 'getWorkspaceDetails').mockResolvedValue({
        id: 'workspace-1',
        name: 'Team 1',
        forms: { count: 0, href: '' },
        self: { href: '' },
        members: [{ id: 'member-1', email: userEmail, name: 'User Name', role: 'member' }],
      });

      const patchRequests: string[] = [];

      server.use(
        http.patch(`${env.TYPEFORM_API_BASE_URL}/workspaces/:workspaceId`, ({ params }) => {
          patchRequests.push(params.workspaceId as string);
          return new Response(null, { status: 200 });
        })
      );

      await removeUserFromAllWorkspaces({ accessToken, userEmail });

      expect(workspacesModule.getWorkspaces).toHaveBeenCalledTimes(2);
      expect(workspacesModule.getWorkspaces).toHaveBeenCalledWith({
        accessToken,
        page: 1,
        isEuDataCenter: false,
      });
      expect(workspacesModule.getWorkspaces).toHaveBeenCalledWith({
        accessToken,
        page: 2,
        isEuDataCenter: false,
      });
    });

    it('should use EU data center when specified', async () => {
      vi.spyOn(workspacesModule, 'getWorkspaces').mockResolvedValue({
        items: [],
        page_count: 1,
        total_items: 0,
      });

      await removeUserFromAllWorkspaces({
        accessToken,
        userEmail,
        isEuDataCenter: true,
      });

      expect(workspacesModule.getWorkspaces).toHaveBeenCalledWith({
        accessToken,
        page: 1,
        isEuDataCenter: true,
      });
    });
  });
});
