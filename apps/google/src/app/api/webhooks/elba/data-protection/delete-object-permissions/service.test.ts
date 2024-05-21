import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteDataProtectionObjectPermissions } from './service';

describe('delete-data-protection-object-permissions', () => {
  it('Should be ignored if metadata is not valid', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteDataProtectionObjectPermissions({
      organisationId: 'organisation-id',
      metadata: null,
      objectId: 'object-id',
      permissionIds: ['permission-id-1', 'permission-id-2'],
    });
    expect(send).toBeCalledTimes(0);
  });

  it('Should successfully request data protection object permissions deletion', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteDataProtectionObjectPermissions({
      organisationId: 'organisation-id',
      metadata: { ownerId: 'owner-id' },
      objectId: 'object-id',
      permissionIds: ['permission-id-1', 'permission-id-2'],
    });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        objectId: 'object-id',
        organisationId: 'organisation-id',
        ownerId: 'owner-id',
        permissionIds: ['permission-id-1', 'permission-id-2'],
      },
      name: 'google/data_protection.delete_object_permissions.requested',
    });
  });
});
