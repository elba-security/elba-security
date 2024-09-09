import { expect, test, describe, vi } from 'vitest';
import { env } from '@/env';
import * as client from './commons/client';
import {
  getPaginatedOrganizationInstallations,
  getPaginatedOrganizationMembers,
} from './organization';

const installationId = 123456;
const login = 'some-login';

const validMembers = Array.from({ length: 5 }, (_, i) => ({
  role: i % 2 === 0 ? 'MEMBER' : 'ADMIN',
  node: {
    id: `user-id-${i}`,
    login: `user-login-${i}`,
    email: `user-email-${i}@foo.bar`,
    name: `user-${i}-name`,
  },
}));

const invalidMembers = [
  {
    role: 'DOG',
    node: {
      id: `dog-id-1`,
    },
  },
];

const validInstallations = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  app_id: i,
  app_slug: `app-${i}`,
  created_at: new Date().toISOString(),
  permissions: { foo: 'read', baz: 'write', biz: 'read' },
  suspended_at: null,
}));

const invalidInstallations = [
  {
    id: 'wrong-format',
    app_slug: 12,
  },
];

describe('organization connector', () => {
  describe('getPaginatedOrganizationMembers', () => {
    test('should return members and nextCursor when organization exists', async () => {
      const nextCursor = 'next-cursor';

      // @ts-expect-error this is a mock
      vi.spyOn(client, 'createOctokitApp').mockReturnValue({
        getInstallationOctokit: vi.fn().mockResolvedValue({
          graphql: vi.fn().mockResolvedValue({
            organization: {
              membersWithRole: {
                totalCount: 100,
                pageInfo: { hasNextPage: true, endCursor: nextCursor },
                edges: [...validMembers, ...invalidMembers],
              },
            },
          }),
        }),
      });

      await expect(
        getPaginatedOrganizationMembers(installationId, login, 'initial-cursor')
      ).resolves.toStrictEqual({
        validMembers: validMembers.map(({ role, node }) => ({ role, ...node })),
        invalidMembers: invalidMembers.map(({ role, node }) => ({ role, ...node })),
        nextCursor,
      });
    });

    test('should throw when organization does not exists', async () => {
      vi.spyOn(client, 'createOctokitApp').mockReturnValue({
        octokit: {
          // @ts-expect-error this is a mock
          getInstallationOctokit: vi.fn().mockResolvedValue({
            graphql: vi.fn().mockResolvedValue({
              organization: null,
            }),
          }),
        },
      });

      await expect(
        getPaginatedOrganizationMembers(installationId, login, 'initial-cursor')
      ).rejects.toBeInstanceOf(Error);
    });
  });

  describe('getPaginatedOrganizationInstallations', () => {
    test('should return installations and nextCursor', async () => {
      const nextCursor = '4';
      const cursor = '3';

      const request = vi.fn().mockResolvedValue({
        data: {
          total_count: 120,
          installations: [...validInstallations, ...invalidInstallations],
        },
        headers: {
          link: `<https://api.github.com/repositories/1300192/issues?page=2>; rel="prev", <https://api.github.com/repositories/1300192/issues?page=${nextCursor}>; rel="next", <https://api.github.com/repositories/1300192/issues?page=515>; rel="last", <https://api.github.com/repositories/1300192/issues?page=1>; rel="first"`,
        },
      });
      // @ts-expect-error this is a mock
      vi.spyOn(client, 'createOctokitApp').mockReturnValue({
        getInstallationOctokit: vi.fn().mockResolvedValue({
          request,
        }),
      });

      await expect(
        getPaginatedOrganizationInstallations(installationId, login, cursor)
      ).resolves.toStrictEqual({
        validInstallations,
        invalidInstallations,
        nextCursor,
      });
      expect(request).toBeCalledTimes(1);
      expect(request).toBeCalledWith('GET /orgs/{org}/installations', {
        org: login,
        per_page: env.THIRD_PARTY_APPS_SYNC_BATCH_SIZE,
        page: Number(cursor),
      });
    });
  });
});
