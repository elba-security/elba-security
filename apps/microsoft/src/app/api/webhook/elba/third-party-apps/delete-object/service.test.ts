import { expect, test, describe, vi } from 'vitest';
import { ZodError } from 'zod';
import * as client from '@/inngest/client';
import { deleteThirdPartyAppsObject } from './service';

const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const appId = 'some-app-id';
const permissionId = 'some-permission-id';
const oauthGrantIds = ['grant-id-1', 'grant-id-2'];

describe('deleteThirdPartyAppsObject', () => {
  test('should throw when metadata is invalid', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(
      deleteThirdPartyAppsObject({ organisationId, appId, metadata: { permissionId: 18 } })
    ).rejects.toBeInstanceOf(ZodError);

    expect(send).toBeCalledTimes(0);
  });

  test('should send a delete app permission event when metadata contains valid permissionId', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(
      deleteThirdPartyAppsObject({ organisationId, appId, metadata: { permissionId } })
    ).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'microsoft/third_party_apps.revoke_app_permission.requested',
      data: {
        organisationId,
        appId,
        permissionId,
        oauthGrantIds: undefined,
      },
    });
  });

  test('should send a delete app permission event when metadata contains oauthGrantIds', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(
      deleteThirdPartyAppsObject({ organisationId, appId, metadata: { oauthGrantIds } })
    ).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'microsoft/third_party_apps.revoke_app_permission.requested',
      data: {
        organisationId,
        appId,
        permissionId: undefined,
        oauthGrantIds,
      },
    });
  });

  test('should send a delete app permission event when metadata contains oauthGrantIds and permissionId', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(
      deleteThirdPartyAppsObject({
        organisationId,
        appId,
        metadata: { oauthGrantIds, permissionId },
      })
    ).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'microsoft/third_party_apps.revoke_app_permission.requested',
      data: {
        organisationId,
        appId,
        permissionId,
        oauthGrantIds,
      },
    });
  });
});
