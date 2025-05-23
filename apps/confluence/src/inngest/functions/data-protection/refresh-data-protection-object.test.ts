import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import * as authConnector from '@/connectors/confluence/auth';
import * as spacesConnector from '@/connectors/confluence/spaces';
import * as pagesConnector from '@/connectors/confluence/pages';
import type {
  PageObjectMetadata,
  SpaceObjectMetadata,
} from '@/connectors/elba/data-protection/metadata';
import { db } from '@/database/client';
import { usersTable } from '@/database/schema';
import { env } from '@/common/env';
import { accessToken, organisationUsers } from '../__mocks__/organisations';
import { spaceWithPermissions, spaceWithPermissionsObject } from '../__mocks__/confluence-spaces';
import { pageWithRestrictions, pageWithRestrictionsObject } from '../__mocks__/confluence-pages';
import { refreshDataProtectionObject } from './refresh-data-protection-object';

const organisationId = '10000000-0000-0000-0000-000000000000';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const instanceId = '1234';

const objectId = 'object-id';

const globalSpaceObjectMetadata: SpaceObjectMetadata = {
  objectType: 'space',
  type: 'global',
  key: 'global-space',
};

const personalSpaceObjectMetadata: SpaceObjectMetadata = {
  objectType: 'space',
  type: 'personal',
  key: 'personal-space',
};

const pageObjectMetadata: PageObjectMetadata = {
  objectType: 'page',
};

const setup = createInngestFunctionMock(
  refreshDataProtectionObject,
  'confluence/data_protection.refresh_object.requested'
);

describe('refresh-data-protection-object', () => {
  beforeEach(async () => {
    await db.delete(usersTable).execute();
  });

  describe('when object is a space', () => {
    test('should delete object when space does not exists', async () => {
      const elba = spyOnElba();
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
      vi.spyOn(spacesConnector, 'getSpaceWithPermissions').mockResolvedValue(null);
      vi.spyOn(pagesConnector, 'getPageWithRestrictions').mockResolvedValue(null);
      const [result] = setup({
        objectId,
        organisationId,
        metadata: personalSpaceObjectMetadata,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ result: 'deleted' });

      expect(spacesConnector.getSpaceWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpaceWithPermissions).toBeCalledWith({
        instanceId,
        accessToken,
        id: objectId,
        permissionsMaxPage: 1,
      });
      expect(pagesConnector.getPageWithRestrictions).toBeCalledTimes(0);

      expect(elba).toBeCalledTimes(1);
      expect(elba).toBeCalledWith({
        organisationId,
        region,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
      });
      const elbaInstance = elba.mock.results.at(0)?.value;

      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
        ids: [objectId],
      });
    });

    test('should refresh object when space exists and is personal', async () => {
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
      const elba = spyOnElba();
      await db.insert(usersTable).values(organisationUsers);

      vi.spyOn(spacesConnector, 'getSpaceWithPermissions').mockResolvedValue(spaceWithPermissions);
      vi.spyOn(pagesConnector, 'getPageWithRestrictions').mockResolvedValue(null);
      const [result] = setup({
        objectId,
        organisationId,
        metadata: personalSpaceObjectMetadata,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ result: 'updated' });

      expect(spacesConnector.getSpaceWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpaceWithPermissions).toBeCalledWith({
        instanceId,
        accessToken,
        id: objectId,
        permissionsMaxPage: 1,
      });
      expect(pagesConnector.getPageWithRestrictions).toBeCalledTimes(0);

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
    });

    test('should refresh object when space exists and is global', async () => {
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
      const elba = spyOnElba();
      await db.insert(usersTable).values(organisationUsers);

      vi.spyOn(spacesConnector, 'getSpaceWithPermissions').mockResolvedValue(spaceWithPermissions);
      vi.spyOn(pagesConnector, 'getPageWithRestrictions').mockResolvedValue(null);
      const [result] = setup({
        objectId,
        organisationId,
        metadata: globalSpaceObjectMetadata,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ result: 'updated' });

      expect(spacesConnector.getSpaceWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpaceWithPermissions).toBeCalledWith({
        instanceId,
        accessToken,
        id: objectId,
        permissionsMaxPage: 10,
      });
      expect(pagesConnector.getPageWithRestrictions).toBeCalledTimes(0);

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
    });
  });

  describe('when object is a page', () => {
    test('should delete object when page does not exists', async () => {
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
      const elba = spyOnElba();

      vi.spyOn(spacesConnector, 'getSpaceWithPermissions').mockResolvedValue(null);
      vi.spyOn(pagesConnector, 'getPageWithRestrictions').mockResolvedValue(null);
      const [result] = setup({
        objectId,
        organisationId,
        metadata: pageObjectMetadata,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ result: 'deleted' });

      expect(spacesConnector.getSpaceWithPermissions).toBeCalledTimes(0);
      expect(pagesConnector.getPageWithRestrictions).toBeCalledTimes(1);
      expect(pagesConnector.getPageWithRestrictions).toBeCalledWith({
        instanceId,
        accessToken,
        id: objectId,
      });

      expect(elba).toBeCalledTimes(1);
      expect(elba).toBeCalledWith({
        organisationId,
        region,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
      });
      const elbaInstance = elba.mock.results.at(0)?.value;

      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
      expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
        ids: [objectId],
      });
    });

    test('should refresh object when page exists', async () => {
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
      const elba = spyOnElba();
      await db.insert(usersTable).values(organisationUsers);

      vi.spyOn(spacesConnector, 'getSpaceWithPermissions').mockResolvedValue(null);
      vi.spyOn(pagesConnector, 'getPageWithRestrictions').mockResolvedValue(pageWithRestrictions);
      const [result] = setup({
        objectId,
        organisationId,
        metadata: pageObjectMetadata,
        nangoConnectionId,
        region,
      });

      await expect(result).resolves.toStrictEqual({ result: 'updated' });

      expect(spacesConnector.getSpaceWithPermissions).toBeCalledTimes(0);
      expect(pagesConnector.getPageWithRestrictions).toBeCalledTimes(1);
      expect(pagesConnector.getPageWithRestrictions).toBeCalledWith({
        instanceId,
        accessToken,
        id: objectId,
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
        objects: [pageWithRestrictionsObject],
      });
    });
  });
});
