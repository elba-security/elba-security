import { http } from 'msw';
import { describe, expect, it, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { TypeformConnectionError } from './commons/errors';
import { getWorkspaces, getWorkspaceDetails } from './workspaces';

const accessToken = 'test-token';

describe('workspaces connector', () => {
  describe('getWorkspaces', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.TYPEFORM_API_BASE_URL}/workspaces`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');

          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(null, { status: 401 });
          }

          if (page === '1') {
            return Response.json({
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
              page_count: 2,
              total_items: 3,
            });
          }

          if (page === '2') {
            return Response.json({
              items: [
                {
                  id: 'workspace-3',
                  name: 'Engineering Team',
                  forms: [{ href: 'https://api.typeform.com/forms', count: 10 }],
                  self: { href: 'https://api.typeform.com/workspaces/workspace-3' },
                },
              ],
              page_count: 2,
              total_items: 3,
            });
          }

          return new Response(null, { status: 400 });
        })
      );
    });

    it('should fetch workspaces successfully', async () => {
      const result = await getWorkspaces({ accessToken });

      expect(result.items).toHaveLength(2);
      expect(result.page_count).toBe(2);
      expect(result.total_items).toBe(3);
      expect(result.items[0]).toMatchObject({
        id: 'workspace-1',
        name: 'Marketing Team',
      });
      expect(result.items[1]).toMatchObject({
        id: 'workspace-2',
        name: 'Sales Team',
      });
    });

    it('should handle pagination', async () => {
      const result = await getWorkspaces({ accessToken, page: 2 });

      expect(result.items).toHaveLength(1);
      expect(result.page_count).toBe(2);
      expect(result.total_items).toBe(3);
      expect(result.items[0]).toMatchObject({
        id: 'workspace-3',
        name: 'Engineering Team',
      });
    });

    it('should throw on unauthorized access', async () => {
      await expect(getWorkspaces({ accessToken: 'invalid' })).rejects.toThrow(
        new TypeformConnectionError('unauthorized', 'Invalid access token')
      );
    });

    it('should use EU API when specified', async () => {
      let capturedUrl = '';

      server.use(
        http.get(`${env.TYPEFORM_EU_API_BASE_URL}/workspaces`, ({ request }) => {
          capturedUrl = request.url;
          return Response.json({
            items: [],
            page_count: 1,
            total_items: 0,
          });
        })
      );

      await getWorkspaces({ accessToken, isEuDataCenter: true });
      expect(capturedUrl).toContain('api.eu.typeform.com');
    });
  });

  describe('getWorkspaceDetails', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.TYPEFORM_API_BASE_URL}/workspaces/:workspaceId`, ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(null, { status: 401 });
          }

          if (params.workspaceId === 'workspace-1') {
            return Response.json({
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
            });
          }

          return new Response(null, { status: 404 });
        })
      );
    });

    it('should fetch workspace details with members', async () => {
      const result = await getWorkspaceDetails({
        accessToken,
        workspaceId: 'workspace-1',
      });

      expect(result).toMatchObject({
        id: 'workspace-1',
        name: 'Marketing Team',
      });
      expect(result.members).toBeDefined();
      expect(result.members).toHaveLength(2);
      expect(result.members?.[0]).toMatchObject({
        email: 'john@company.com',
        name: 'John Doe',
        role: 'owner',
      });
      expect(result.members?.[1]).toMatchObject({
        email: 'jane@company.com',
        name: 'Jane Smith',
        role: 'member',
      });
    });

    it('should throw on workspace not found', async () => {
      await expect(
        getWorkspaceDetails({ accessToken, workspaceId: 'non-existent' })
      ).rejects.toThrow(new TypeformConnectionError('unknown', 'Workspace not found'));
    });

    it('should throw on unauthorized access', async () => {
      await expect(
        getWorkspaceDetails({ accessToken: 'invalid', workspaceId: 'workspace-1' })
      ).rejects.toThrow(new TypeformConnectionError('unauthorized', 'Invalid access token'));
    });
  });
});
