import { expect, test, describe, vi } from 'vitest';
import * as client from './client';
import { getPaginatedOrganizationMembers } from './organization';

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

describe('organization repository', () => {
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
});
