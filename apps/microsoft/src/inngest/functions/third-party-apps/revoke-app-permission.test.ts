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
const oauthGrantIds = ['oauth-grant-1', 'oauth-grant-2'];
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
    const deleteOauthGrant = vi
      .spyOn(appsConnector, 'deleteOauthGrant')
      .mockResolvedValue(undefined);

    const [result] = setup({
      organisationId: organisation.id,
      appId,
      permissionId,
      oauthGrantIds,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(deleteAppPermission).toBeCalledTimes(0);
    expect(deleteOauthGrant).toBeCalledTimes(0);
  });

  test('should abort when permissionId and oauthGrantIds are empty', async () => {
    const deleteAppPermission = vi
      .spyOn(appsConnector, 'deleteAppPermission')
      .mockResolvedValue(undefined);
    const deleteOauthGrant = vi
      .spyOn(appsConnector, 'deleteOauthGrant')
      .mockResolvedValue(undefined);

    const [result] = setup({
      organisationId: organisation.id,
      appId,
      permissionId: undefined,
      oauthGrantIds: [],
    });

    await expect(result).resolves.toMatchObject({ status: 'ignored' });

    expect(deleteAppPermission).toBeCalledTimes(0);
    expect(deleteOauthGrant).toBeCalledTimes(0);
  });

  test('should delete the app permission and oauth grants when the organisation can be retrieved', async () => {
    await db.insert(organisationsTable).values(organisation);
    const deleteAppPermission = vi
      .spyOn(appsConnector, 'deleteAppPermission')
      .mockResolvedValue(undefined);
    const deleteOauthGrant = vi
      .spyOn(appsConnector, 'deleteOauthGrant')
      .mockResolvedValue(undefined);

    const [result] = setup({
      organisationId: organisation.id,
      appId,
      permissionId,
      oauthGrantIds,
    });

    await expect(result).resolves.toMatchObject({ status: 'deleted' });

    expect(deleteAppPermission).toBeCalledTimes(1);
    expect(deleteAppPermission).toBeCalledWith({
      appId,
      permissionId,
      tenantId: organisation.tenantId,
      token,
    });

    expect(deleteOauthGrant).toBeCalledTimes(2);
    expect(deleteOauthGrant).toHaveBeenNthCalledWith(1, {
      token,
      oauthGrantId: oauthGrantIds[0],
    });
    expect(deleteOauthGrant).toHaveBeenNthCalledWith(2, {
      token,
      oauthGrantId: oauthGrantIds[1],
    });
  });
});
