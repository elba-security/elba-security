import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as spacesConnector from '@/connectors/confluence/spaces';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import { env } from '@/common/env';
import { accessToken, organisation, organisationUsers } from '../__mocks__/organisations';
import { spaceWithPermissions, spaceWithPermissionsObject } from '../__mocks__/confluence-spaces';
import { syncSpaces } from './sync-spaces';

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(
  syncSpaces,
  'confluence/data_protection.spaces.sync.requested'
);

describe('sync-pages', () => {
  test('should abort when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
      cursor: null,
      spaces: [],
    });
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      type: 'global',
      cursor: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);

    expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(0);
  });

  describe('when type is global', () => {
    test('should continue the global spaces sync when their is more pages', async () => {
      await db.insert(organisationsTable).values(organisation);
      await db.insert(usersTable).values(organisationUsers);
      const elba = spyOnElba();
      vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
        cursor: 'next-cursor',
        spaces: [spaceWithPermissions],
      });
      const [result, { step }] = setup({
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        type: 'global',
        cursor: null,
      });

      await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

      expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpacesWithPermissions).toBeCalledWith({
        accessToken,
        instanceId: organisation.instanceId,
        cursor: null,
        type: 'global',
        limit: env.DATA_PROTECTION_GLOBAL_SPACE_BATCH_SIZE,
        permissionsMaxPage: env.DATA_PROTECTION_GLOBAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      expect(elba).toBeCalledTimes(1);

      expect(elba).toBeCalledWith({
        organisationId: organisation.id,
        region: organisation.region,
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
          organisationId: organisation.id,
          isFirstSync: false,
          syncStartedAt,
          type: 'global',
          cursor: 'next-cursor',
        },
      });
    });

    test('should start the personal spaces sync when their is more no pages', async () => {
      await db.insert(organisationsTable).values(organisation);
      await db.insert(usersTable).values(organisationUsers);
      const elba = spyOnElba();
      vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
        cursor: null,
        spaces: [spaceWithPermissions],
      });
      const [result, { step }] = setup({
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        type: 'global',
        cursor: null,
      });

      await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

      expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpacesWithPermissions).toBeCalledWith({
        accessToken,
        instanceId: organisation.instanceId,
        cursor: null,
        type: 'global',
        limit: env.DATA_PROTECTION_GLOBAL_SPACE_BATCH_SIZE,
        permissionsMaxPage: env.DATA_PROTECTION_GLOBAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      expect(elba).toBeCalledTimes(1);

      expect(elba).toBeCalledWith({
        organisationId: organisation.id,
        region: organisation.region,
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
          organisationId: organisation.id,
          isFirstSync: false,
          syncStartedAt,
          type: 'personal',
          cursor: null,
        },
      });
    });
  });

  describe('when type is personal', () => {
    test('should continue the personal spaces sync when their is more pages', async () => {
      await db.insert(organisationsTable).values(organisation);
      await db.insert(usersTable).values(organisationUsers);
      const elba = spyOnElba();
      vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
        cursor: 'next-cursor',
        spaces: [spaceWithPermissions],
      });
      const [result, { step }] = setup({
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        type: 'personal',
        cursor: null,
      });

      await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

      expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpacesWithPermissions).toBeCalledWith({
        accessToken,
        instanceId: organisation.instanceId,
        cursor: null,
        type: 'personal',
        limit: env.DATA_PROTECTION_PERSONAL_SPACE_BATCH_SIZE,
        permissionsMaxPage: env.DATA_PROTECTION_PERSONAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      expect(elba).toBeCalledTimes(1);

      expect(elba).toBeCalledWith({
        organisationId: organisation.id,
        region: organisation.region,
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
          organisationId: organisation.id,
          isFirstSync: false,
          syncStartedAt,
          type: 'personal',
          cursor: 'next-cursor',
        },
      });
    });

    test('should start the pages sync when their is more no pages', async () => {
      await db.insert(organisationsTable).values(organisation);
      await db.insert(usersTable).values(organisationUsers);
      const elba = spyOnElba();
      vi.spyOn(spacesConnector, 'getSpacesWithPermissions').mockResolvedValue({
        cursor: null,
        spaces: [spaceWithPermissions],
      });
      const [result, { step }] = setup({
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        type: 'personal',
        cursor: null,
      });

      await expect(result).resolves.toStrictEqual({ status: 'completed' });

      expect(spacesConnector.getSpacesWithPermissions).toBeCalledTimes(1);
      expect(spacesConnector.getSpacesWithPermissions).toBeCalledWith({
        accessToken,
        instanceId: organisation.instanceId,
        cursor: null,
        type: 'personal',
        limit: env.DATA_PROTECTION_PERSONAL_SPACE_BATCH_SIZE,
        permissionsMaxPage: env.DATA_PROTECTION_PERSONAL_SPACE_PERMISSIONS_MAX_PAGE,
      });

      expect(elba).toBeCalledTimes(1);

      expect(elba).toBeCalledWith({
        organisationId: organisation.id,
        region: organisation.region,
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
          organisationId: organisation.id,
          isFirstSync: false,
          syncStartedAt,
          cursor: null,
        },
      });
    });
  });
});
