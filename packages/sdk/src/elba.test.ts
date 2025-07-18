/* eslint-disable @typescript-eslint/no-non-null-assertion -- test convenience */
import { expect, test, describe } from 'vitest';
import { Elba } from './elba';
import type { User } from './resources/users/types';
import type { ThirdPartyAppsObject } from './resources/third-party-apps/types';
import type { DataProtectionObject } from './resources/data-protection/types';
import type { ConfigurationObject } from './resources/configurations/types';

const options = {
  organisationId: '22bc932d-a132-4a63-bde8-5cb5609f0e73',
  baseUrl: process.env.ELBA_API_BASE_URL!,
  apiKey: process.env.ELBA_API_KEY!,
  region: 'us',
};

describe('users', () => {
  describe('updateUsers', () => {
    test('should call the right endpoint and return the response data', async () => {
      const users: User[] = Array.from({ length: 5 }, (_, i) => ({
        id: `user-id-${i}`,
        displayName: `user-${i}`,
        email: `email-${i}@foo.bar`,
        additionalEmails: [`email-2-${i}@foo.bar`, `email-3-${i}@bar.foo`],
        authMethod: i % 2 === 0 ? 'mfa' : 'password',
        role: `ROLE_${i}`,
      }));
      const elba = new Elba(options);
      await expect(elba.users.update({ users })).resolves.toStrictEqual({
        success: true,
      });
    });
  });

  describe('deleteUsers', () => {
    test('should call the right endpoint and return the response data when using syncedBefore', async () => {
      const syncedBefore = new Date().toISOString();
      const elba = new Elba(options);
      await expect(elba.users.delete({ syncedBefore })).resolves.toStrictEqual({
        success: true,
      });
    });

    test('should call the right endpoint and return the response data when using ids', async () => {
      const elba = new Elba(options);
      await expect(elba.users.delete({ ids: ['1', '2', '3'] })).resolves.toStrictEqual({
        success: true,
      });
    });
  });
});

describe('third party apps', () => {
  describe('updateObjects', () => {
    test('should call the right endpoint and return the response data', async () => {
      const apps: ThirdPartyAppsObject[] = Array.from({ length: 5 }, (_, i) => ({
        id: `id-${i}`,
        name: `name-${i}`,
        description: `description-${i}`,
        logoUrl: `logo-${i}`,
        publisherName: `publiser-name-${i}`,
        url: `http://foo.bar/${i}`,
        users: Array.from({ length: 3 }, (item, j) => ({
          id: `user-id-${j}`,
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          scopes: ['scope-1', 'scope-2'],
          metadata: {
            foo: 'bar',
          },
        })),
      }));
      const elba = new Elba(options);
      await expect(elba.thirdPartyApps.updateObjects({ apps })).resolves.toStrictEqual({
        data: {
          processedApps: apps.length,
          processedUsers: 3,
        },
      });
    });
  });

  describe('deleteObjects', () => {
    test('should call the right endpoint and return the response data when using syncedBefore', async () => {
      const syncedBefore = new Date().toISOString();
      const elba = new Elba(options);
      await expect(elba.thirdPartyApps.deleteObjects({ syncedBefore })).resolves.toStrictEqual({
        success: true,
      });
    });

    test('should call the right endpoint and return the response data when using ids', async () => {
      const elba = new Elba(options);
      await expect(
        elba.thirdPartyApps.deleteObjects({
          ids: Array.from({ length: 5 }, (_, i) => ({ appId: `app-${i}`, userId: `user-${i}` })),
        })
      ).resolves.toStrictEqual({
        success: true,
      });
    });
  });
});

describe('data protection', () => {
  describe('updateObjects', () => {
    test('should call the right endpoint and return the response data', async () => {
      const objects: DataProtectionObject[] = Array.from({ length: 5 }, (_, i) => ({
        id: `id-${i}`,
        name: `name-${i}`,
        url: `https://foo.bar/${i}`,
        ownerId: `owner-id-${i}`,
        metadata: { foo: 'bar' },
        contentHash: `${i}1234`,
        permissions: Array.from({ length: 5 }, (item, j) => ({
          id: `permission-${i}-${j}`,
          metadata: { fiz: 'baz' },

          type: (['user', 'domain', 'anyone'] as const)[j % 3]!,
          email: `permission-${i}-${j}@email.com`,
          userId: `user-${i}-${j}`,
          domain: `domain-${i}-${j}`,
          displayName: `permission ${i}-${j}`,
        })),
      }));

      const elba = new Elba(options);
      await expect(elba.dataProtection.updateObjects({ objects })).resolves.toStrictEqual({
        success: true,
      });
    });
  });

  describe('deleteObjects', () => {
    test('should call the right endpoint and return the response data when using syncedBefore', async () => {
      const syncedBefore = new Date().toISOString();
      const elba = new Elba(options);
      await expect(elba.dataProtection.deleteObjects({ syncedBefore })).resolves.toStrictEqual({
        success: true,
      });
    });

    test('should call the right endpoint and return the response data when using ids', async () => {
      const elba = new Elba(options);
      await expect(
        elba.dataProtection.deleteObjects({ ids: ['1', '2', '3'] })
      ).resolves.toStrictEqual({
        success: true,
      });
    });
  });
});

describe('connection status', () => {
  describe('update', () => {
    test('should call the right endpoint and return the response data', async () => {
      const elba = new Elba(options);
      await expect(
        elba.connectionStatus.update({ errorType: 'unauthorized' })
      ).resolves.toStrictEqual({
        success: true,
      });
    });
  });
});

describe('organisations', () => {
  describe('list', () => {
    test('should call the right endpoint and return the response data', async () => {
      const elba = new Elba(options);
      await expect(elba.organisations.list()).resolves.toStrictEqual({
        organisations: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            nangoConnectionId: 'nango-connection-id-1',
          },
          {
            id: '00000000-0000-0000-0000-000000000002',
            nangoConnectionId: 'nango-connection-id-2',
          },
        ],
      });
    });
  });
});

describe('configurations', () => {
  describe('update', () => {
    test('should call the right endpoint and return the response data', async () => {
      const configurations: ConfigurationObject[] = [
        {
          category: 'authentication',
          sub_category: 'mfa_policy',
          configuration: {
            enabled: true,
            enforcement: 'required',
            allowed_methods: ['authenticator_app', 'security_key'],
            grace_period_days: 7,
          },
          metadata: {
            display_name: 'Multi-Factor Authentication Policy',
            description: 'Organization-wide MFA settings',
            risk_level: 'low',
            documentation_url: 'https://support.google.com/a/answer/175197',
          },
          source_updated_at: new Date().toISOString(),
        },
        {
          category: 'sharing',
          sub_category: 'external_sharing',
          configuration: {
            allow_external_sharing: true,
            require_approval: true,
            allowed_domains: ['trusted-partner.com'],
            default_link_sharing: 'restricted',
          },
          metadata: {
            display_name: 'External Sharing Settings',
            risk_level: 'medium',
          },
        },
      ];

      const elba = new Elba(options);
      await expect(
        elba.configurations.update({
          organisationId: options.organisationId,
          configurations,
        })
      ).resolves.toStrictEqual({
        success: true,
        data: {
          received: configurations.length,
          created: configurations.length,
          updated: 0,
          deleted: 0,
        },
      });
    });

    test('should call the right endpoint with syncedBefore parameter', async () => {
      const configurations: ConfigurationObject[] = [
        {
          category: 'authentication',
          sub_category: 'password_policy',
          configuration: {
            minimum_length: 12,
            require_uppercase: true,
            require_numbers: true,
          },
        },
      ];

      const syncedBefore = new Date().toISOString();
      const elba = new Elba(options);
      await expect(
        elba.configurations.update(
          {
            organisationId: options.organisationId,
            configurations,
          },
          { syncedBefore }
        )
      ).resolves.toStrictEqual({
        success: true,
        data: {
          received: configurations.length,
          created: configurations.length,
          updated: 0,
          deleted: 0,
        },
      });
    });
  });

  describe('delete', () => {
    test('should call the right endpoint and return the response data when using syncedBefore', async () => {
      const syncedBefore = new Date().toISOString();
      const elba = new Elba(options);
      await expect(
        elba.configurations.delete({
          organisationId: options.organisationId,
          syncedBefore,
        })
      ).resolves.toStrictEqual({
        success: true,
      });
    });

    test('should call the right endpoint and return the response data when using ids', async () => {
      const elba = new Elba(options);
      await expect(
        elba.configurations.delete({
          organisationId: options.organisationId,
          ids: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
        })
      ).resolves.toStrictEqual({
        success: true,
      });
    });
  });
});
