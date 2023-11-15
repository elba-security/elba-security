import { expect, test, describe } from 'vitest';
import { ElbaRepository } from './elba.repository';
import type { User } from './resources/users/types';
import type { ThirdPartyAppsObject } from './resources/third-party-apps/types';

const organisationId = '22bc932d-a132-4a63-bde8-5cb5609f0e73';

describe('users', () => {
  describe('updateUsers', () => {
    test('should call the right endpoint and return the response data', async () => {
      const users: User[] = Array.from({ length: 5 }, (_, i) => ({
        id: `user-id-${i}`,
        displayName: `user-${i}`,
        email: `email-${i}@foo.bar`,
        additionalEmails: [`email-2-${i}@foo.bar`, `email-3-${i}@bar.foo`],
      }));
      const elba = new ElbaRepository(organisationId);
      await expect(elba.users.updateUsers(users)).resolves.toStrictEqual({
        insertedOrUpdatedCount: users.length,
      });
    });
  });

  describe('deleteUsers', () => {
    test('should call the right endpoint and return the response data', async () => {
      const lastSyncedBefore = new Date();
      const elba = new ElbaRepository(organisationId);
      await expect(elba.users.deleteUsers(lastSyncedBefore)).resolves.toStrictEqual({
        success: true,
      });
    });
  });
});

describe('third party apps', () => {
  describe('updateObjects', () => {
    test('should call the right endpoint and return the response data', async () => {
      const objects: ThirdPartyAppsObject[] = Array.from({ length: 5 }, (_, i) => ({
        id: `id-${i}`,
        name: `name-${i}`,
        description: `description-${i}`,
        logoUrl: `logo-${i}`,
        publisherName: `publiser-name-${i}`,
        url: `http://foo.bar/${i}`,
        users: Array.from({ length: 3 }, (item, j) => ({
          id: `user-id-${j}`,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          scopes: ['scope-1', 'scope-2'],
          metadata: {
            foo: 'bar',
          },
        })),
      }));
      const elba = new ElbaRepository(organisationId);
      await expect(elba.thridPartyApps.updateObjects(objects)).resolves.toStrictEqual({
        data: {
          processedApps: objects.length,
          processedUsers: 3,
        },
      });
    });
  });

  describe('deleteUsers', () => {
    test('should call the right endpoint and return the response data', async () => {
      const lastSyncedBefore = new Date();
      const elba = new ElbaRepository(organisationId);
      await expect(elba.users.deleteUsers(lastSyncedBefore)).resolves.toStrictEqual({
        success: true,
      });
    });
  });
});
