import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as getItemConnector from '@/connectors/microsoft/share-point/item';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/share-point/items';
import type { MicrosoftDriveItemPermissions } from '@/connectors/microsoft/share-point/permissions';
import * as permissionsConnector from '@/connectors/microsoft/share-point/permissions';
import { env } from '@/common/env';
import { refreshItem } from './refresh-item';
import { formatDataProtectionItems } from './common/helpers';

const token = 'test-token';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const itemId = 'some-item-id';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const item: MicrosoftDriveItem = {
  id: itemId,
  name: `item-name-1`,
  webUrl: `http://webUrl-1.somedomain.net`,
  createdBy: {
    user: {
      displayName: `some-display-name-1`,
      id: `some-user-id-1`,
      email: `some-user-email-1`,
    },
  },
  parentReference: {
    id: 'some-parent-id-1',
  },
  lastModifiedDateTime: '2024-02-23T15:50:09Z',
};

const permissions: MicrosoftDriveItemPermissions[] = Array.from({ length: 10 }, (_, i) => ({
  id: `permission-id-${i}`,
  roles: ['write'],
  link: { scope: 'users' },
  grantedToV2: {
    user: {
      displayName: `some-display-name-${i}`,
      id: `some-user-id-${i}`,
      email: `some-user-email-${i}`,
    },
  },
  grantedToIdentitiesV2: [
    {
      user: {
        displayName: `some-display-name-${i}`,
        id: `some-user-id-${i}`,
        email: `some-user-email-${i}`,
      },
    },
  ],
}));

const setupData = {
  id: itemId,
  organisationId: organisation.id,
  metadata: {
    siteId,
    driveId,
  },
};

const setup = createInngestFunctionMock(
  refreshItem,
  'share-point/data_protection.refresh_object.requested'
);

describe('refresh-object', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort refresh when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(getItemConnector, 'getItem').mockResolvedValue(item);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockResolvedValue({
      permissions,
      nextSkipToken: null,
    });

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.run).toBeCalledTimes(0);
    expect(getItemConnector.getItem).toBeCalledTimes(0);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
  });

  test('should update elba object when item and permissions exists', async () => {
    const elba = spyOnElba();

    vi.spyOn(getItemConnector, 'getItem').mockResolvedValue(item);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockResolvedValue({
      permissions,
      nextSkipToken: null,
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toBeUndefined();
    expect(step.run).toBeCalledTimes(1);

    expect(getItemConnector.getItem).toBeCalledTimes(1);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(1);

    expect(getItemConnector.getItem).toBeCalledWith({
      token,
      siteId,
      driveId,
      itemId,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      token,
      siteId,
      driveId,
      itemId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const dataProtectionItem = formatDataProtectionItems({
      itemsWithPermisions: [
        {
          item,
          permissions,
        },
      ],
      siteId,
      driveId,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: dataProtectionItem,
    });
  });

  test('should delete elba object when item not found', async () => {
    const elba = spyOnElba();

    vi.spyOn(getItemConnector, 'getItem').mockResolvedValue(null);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockResolvedValue({
      permissions,
      nextSkipToken: null,
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toBeUndefined();
    expect(step.run).toBeCalledTimes(1);

    expect(getItemConnector.getItem).toBeCalledTimes(1);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(1);

    expect(getItemConnector.getItem).toBeCalledWith({
      token,
      siteId,
      driveId,
      itemId,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      token,
      siteId,
      driveId,
      itemId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: [item.id],
    });
  });

  test('should delete elba object when there are no valid permissions', async () => {
    const elba = spyOnElba();

    vi.spyOn(getItemConnector, 'getItem').mockResolvedValue(item);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockResolvedValue({
      permissions: [],
      nextSkipToken: null,
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toBeUndefined();
    expect(step.run).toBeCalledTimes(1);

    expect(getItemConnector.getItem).toBeCalledTimes(1);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(1);

    expect(getItemConnector.getItem).toBeCalledWith({
      token,
      siteId,
      driveId,
      itemId,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      token,
      siteId,
      driveId,
      itemId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: [item.id],
    });
  });
});
