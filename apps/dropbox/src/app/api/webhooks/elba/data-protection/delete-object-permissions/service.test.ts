import { expect, test, describe, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteDataProtectionObjectPermissions } from './service';

describe('deleteDataProtectionObjectPermissions', () => {
  test('should send request to delete the object permissions', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await deleteDataProtectionObjectPermissions({
      id: 'file-id-1',
      organisationId: '00000000-0000-0000-0000-000000000001',
      metadata: {
        ownerId: 'team-member-id-1',
        type: 'file',
        isPersonal: true,
      },
      permissions: [
        {
          id: 'permission-id-1',
          metadata: {
            sharedLinks: ['https://dropbox.com/link-1', 'https://dropbox.com/link-2'],
          },
        },
        {
          id: 'permission-id-2',
          metadata: null,
        },
      ],
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        data: {
          metadata: {
            isPersonal: true,
            ownerId: 'team-member-id-1',
            type: 'file',
          },
          objectId: 'file-id-1',
          organisationId: '00000000-0000-0000-0000-000000000001',
          permission: {
            id: 'permission-id-1',
            metadata: {
              sharedLinks: ['https://dropbox.com/link-1', 'https://dropbox.com/link-2'],
            },
          },
        },
        name: 'dropbox/data_protection.delete_object_permission.requested',
      },
      {
        data: {
          metadata: {
            isPersonal: true,
            ownerId: 'team-member-id-1',
            type: 'file',
          },
          objectId: 'file-id-1',
          organisationId: '00000000-0000-0000-0000-000000000001',
          permission: {
            id: 'permission-id-2',
            metadata: null,
          },
        },
        name: 'dropbox/data_protection.delete_object_permission.requested',
      },
    ]);
  });
});
