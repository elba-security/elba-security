import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as spacesConnector from '@/connectors/confluence/spaces';
import { db } from '@/database/client';
import * as nangoAPI from '@/common/nango';
import * as authConnector from '@/connectors/confluence/auth';
import { usersTable } from '@/database/schema';
import { env } from '@/common/env';
import { accessToken, organisationUsers } from '../__mocks__/organisations';
import { spaceWithPermissions, spaceWithPermissionsObject } from '../__mocks__/confluence-spaces';
import { syncSpaces } from './sync-spaces';

const organisationId = '10000000-0000-0000-0000-000000000000';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const instanceId = '1234';

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(
  syncSpaces,
  'confluence/data_protection.spaces.sync.requested'
);

describe('sync-pages', () => {
  beforeEach(async () => {
    await db.delete(usersTable).execute();
  });

  describe('when type is global', () => {
    test('should continue the global spaces sync when their is more pages', async () => {
      // @ts-expect-error -- this is a mock
      vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
        getConnection: vi.fn().mockResolvedValue({
          credentials: { access_token: 'access-token' },
        }),
      });
      vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
        id: '1234',
        url: 'http://foo.bar',
      });
      await db.insert(usersTable).values(organisationUsers);
      const elba = spyOnElba();
      vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
        cursor: 'next-cursor',
        spaces: [spaceWithPermissions],
      });
      const [result, { step }] = setup({
        organisationId,
        isFirstSync: false,
        syncStartedAt,
        type: 'global',
        cursor: null,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

      expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpacesWithPermissions).toBeCalledWith({
        accessToken,
        instanceId,
        cursor: null,
        type: 'global',
        limit: env.DATA_PROTECTION_GLOBAL_SPACE_BATCH_SIZE,
        permissionsMaxPage: env.DATA_PROTECTION_GLOBAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      expect(elba).toBeCalledTimes(1);

      expect(elba).toBeCalledWith({
        organisationId,
        region,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
      });
      const elbaInstance = elba.mock.results.at(0)?.value;

      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
        objects: [spaceWithPermissionsObject],
      });
      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);

      expect(step.sendEvent).toBeCalledTimes(1);
      expect(step.sendEvent).toBeCalledWith('request-next-spaces-sync', {
        name: 'confluence/data_protection.spaces.sync.requested',
        data: {
          organisationId,
          isFirstSync: false,
          syncStartedAt,
          type: 'global',
          cursor: 'next-cursor',
          nangoConnectionId,
          region,
        },
      });
    });

    test('should start the personal spaces sync when their is more no pages', async () => {
      // @ts-expect-error -- this is a mock
      vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
        getConnection: vi.fn().mockResolvedValue({
          credentials: { access_token: 'access-token' },
        }),
      });
      vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
        id: '1234',
        url: 'http://foo.bar',
      });
      await db.insert(usersTable).values(organisationUsers);
      const elba = spyOnElba();
      vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
        cursor: null,
        spaces: [spaceWithPermissions],
      });

      const [result, { step }] = setup({
        organisationId,
        isFirstSync: false,
        syncStartedAt,
        type: 'global',
        cursor: null,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

      expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpacesWithPermissions).toBeCalledWith({
        accessToken,
        instanceId,
        cursor: null,
        type: 'global',
        limit: env.DATA_PROTECTION_GLOBAL_SPACE_BATCH_SIZE,
        permissionsMaxPage: env.DATA_PROTECTION_GLOBAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      expect(elba).toBeCalledTimes(1);

      expect(elba).toBeCalledWith({
        organisationId,
        region,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
      });
      const elbaInstance = elba.mock.results.at(0)?.value;

      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
        objects: [spaceWithPermissionsObject],
      });
      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);

      expect(step.sendEvent).toBeCalledTimes(1);
      expect(step.sendEvent).toBeCalledWith('request-next-spaces-sync', {
        name: 'confluence/data_protection.spaces.sync.requested',
        data: {
          organisationId,
          isFirstSync: false,
          syncStartedAt,
          type: 'personal',
          cursor: null,
          nangoConnectionId,
          region,
        },
      });
    });
  });

  describe('when type is personal', () => {
    test('should continue the personal spaces sync when their is more pages', async () => {
      // @ts-expect-error -- this is a mock
      vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
        getConnection: vi.fn().mockResolvedValue({
          credentials: { access_token: 'access-token' },
        }),
      });
      vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
        id: '1234',
        url: 'http://foo.bar',
      });
      await db.insert(usersTable).values(organisationUsers);
      const elba = spyOnElba();
      vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
        cursor: 'next-cursor',
        spaces: [spaceWithPermissions],
      });
      const [result, { step }] = setup({
        organisationId,
        isFirstSync: false,
        syncStartedAt,
        type: 'personal',
        cursor: null,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

      expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpacesWithPermissions).toBeCalledWith({
        accessToken,
        instanceId,
        cursor: null,
        type: 'personal',
        limit: env.DATA_PROTECTION_PERSONAL_SPACE_BATCH_SIZE,
        permissionsMaxPage: env.DATA_PROTECTION_PERSONAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      expect(elba).toBeCalledTimes(1);

      expect(elba).toBeCalledWith({
        organisationId,
        region,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
      });
      const elbaInstance = elba.mock.results.at(0)?.value;

      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
        objects: [spaceWithPermissionsObject],
      });
      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);

      expect(step.sendEvent).toBeCalledTimes(1);
      expect(step.sendEvent).toBeCalledWith('request-next-spaces-sync', {
        name: 'confluence/data_protection.spaces.sync.requested',
        data: {
          organisationId,
          isFirstSync: false,
          syncStartedAt,
          type: 'personal',
          cursor: 'next-cursor',
          nangoConnectionId,
          region,
        },
      });
    });

    test('should start the pages sync when their is more no pages', async () => {
      // @ts-expect-error -- this is a mock
      vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
        getConnection: vi.fn().mockResolvedValue({
          credentials: { access_token: 'access-token' },
        }),
      });
      vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
        id: '1234',
        url: 'http://foo.bar',
      });
      await db.insert(usersTable).values(organisationUsers);
      const elba = spyOnElba();
      vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
        cursor: null,
        spaces: [spaceWithPermissions],
      });
      const [result, { step }] = setup({
        organisationId,
        isFirstSync: false,
        syncStartedAt,
        type: 'personal',
        cursor: null,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ status: 'completed' });

      expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpacesWithPermissions).toBeCalledWith({
        accessToken,
        instanceId,
        cursor: null,
        type: 'personal',
        limit: env.DATA_PROTECTION_PERSONAL_SPACE_BATCH_SIZE,
        permissionsMaxPage: env.DATA_PROTECTION_PERSONAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      expect(elba).toBeCalledTimes(1);

      expect(elba).toBeCalledWith({
        organisationId,
        region,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
      });
      const elbaInstance = elba.mock.results.at(0)?.value;

      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
      expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
        objects: [spaceWithPermissionsObject],
      });
      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);

      expect(step.sendEvent).toBeCalledTimes(1);
      expect(step.sendEvent).toBeCalledWith('request-pages-sync', {
        name: 'confluence/data_protection.pages.sync.requested',
        data: {
          organisationId,
          isFirstSync: false,
          syncStartedAt,
          cursor: null,
          nangoConnectionId,
          region,
        },
      });
    });
  });
});
