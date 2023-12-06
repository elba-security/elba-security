/* eslint-disable @typescript-eslint/no-non-null-assertion -- test conveniency */
import { expect, test, describe } from 'vitest';
import { Elba } from './elba';
import type { User } from './resources/users/types';
import type { ThirdPartyAppsObject } from './resources/third-party-apps/types';
import type { AuthenticationObject } from './resources/authentication/types';
import type { DataProtectionObject } from './resources/data-protection/types';

const organisationId = '22bc932d-a132-4a63-bde8-5cb5609f0e73';
const sourceId = '12c7a45b-1dea-44f3-a1ed-92816caff31d';
const baseUrl = process.env.ELBA_API_BASE_URL!;
const apiKey = process.env.ELBA_API_KEY!;

describe('users', () => {
  describe('updateUsers', () => {
    test('should call the right endpoint and return the response data', async () => {
      const users: User[] = Array.from({ length: 5 }, (_, i) => ({
        id: `user-id-${i}`,
        displayName: `user-${i}`,
        email: `email-${i}@foo.bar`,
        additionalEmails: [`email-2-${i}@foo.bar`, `email-3-${i}@bar.foo`],
      }));
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
      await expect(elba.users.update({ users })).resolves.toStrictEqual({
        success: true,
      });
    });
  });

  describe('deleteUsers', () => {
    test('should call the right endpoint and return the response data when using syncedBefore', async () => {
      const syncedBefore = new Date().toISOString();
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
      await expect(elba.users.delete({ syncedBefore })).resolves.toStrictEqual({
        success: true,
      });
    });

    test('should call the right endpoint and return the response data when using ids', async () => {
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
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
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
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
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
      await expect(elba.thirdPartyApps.deleteObjects({ syncedBefore })).resolves.toStrictEqual({
        success: true,
      });
    });

    test('should call the right endpoint and return the response data when using ids', async () => {
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
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

describe('authentication', () => {
  describe('updateObjects', () => {
    test('should call the right endpoint and return the response data', async () => {
      const objects: AuthenticationObject[] = Array.from({ length: 5 }, (_, i) => ({
        userId: `id-${i}`,

        authMethod: (['mfa', 'password', 'sso'] as const)[i % 3]!,
      }));
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
      await expect(elba.authentication.updateObjects({ objects })).resolves.toStrictEqual({
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

      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
      await expect(elba.dataProtection.updateObjects({ objects })).resolves.toStrictEqual({
        success: true,
      });
    });
  });

  describe('deleteObjects', () => {
    test('should call the right endpoint and return the response data when using syncedBefore', async () => {
      const syncedBefore = new Date().toISOString();
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
      await expect(elba.dataProtection.deleteObjects({ syncedBefore })).resolves.toStrictEqual({
        success: true,
      });
    });

    test('should call the right endpoint and return the response data when using ids', async () => {
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
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
      const elba = new Elba({ organisationId, sourceId, baseUrl, apiKey });
      await expect(elba.connectionStatus.update({ hasError: true })).resolves.toStrictEqual({
        success: true,
      });
    });
  });
});
