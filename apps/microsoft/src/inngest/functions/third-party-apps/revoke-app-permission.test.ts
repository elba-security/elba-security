import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as appsConnector from '@/connectors/microsoft/apps';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { revokeAppPermission } from './revoke-app-permission';

const appId = 'app-id';
const permissionId = 'permission-id';
const token = 'some-token';

const organisation = {
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
  tenantId: `tenant-0`,
  region: 'us',
  token: await encrypt(token),
};

const setup = createInngestFunctionMock(
  revokeAppPermission,
  'microsoft/third_party_apps.revoke_app_permission.requested'
);

describe('revoke-app-permission', () => {
  test('should abort when the organisation cannot be retrieved', async () => {
    const deleteAppPermission = vi
      .spyOn(appsConnector, 'deleteAppPermission')
      .mockResolvedValue(undefined);
    const [result] = setup({
      organisationId: organisation.id,
      appId,
      permissionId,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(deleteAppPermission).toBeCalledTimes(0);
  });

  test('should delete the app permission when the organisation can be retrieved', async () => {
    await db.insert(organisationsTable).values(organisation);
    const deleteAppPermission = vi
      .spyOn(appsConnector, 'deleteAppPermission')
      .mockResolvedValue(undefined);
    const [result] = setup({
      organisationId: organisation.id,
      appId,
      permissionId,
    });

    await expect(result).resolves.toBeUndefined();

    expect(deleteAppPermission).toBeCalledTimes(1);
    expect(deleteAppPermission).toBeCalledWith({
      appId,
      permissionId,
      tenantId: organisation.tenantId,
      token,
    });
  });
});
