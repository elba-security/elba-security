import { expect, test, describe, vi } from 'vitest';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { inngest } from '@/inngest/client';
import { insertOrganisations } from '@/test-utils/token';
import { POST as handler } from './route';

const organisationId = '00000000-0000-0000-0000-000000000001';

describe('deleteObjectPermissions', () => {
  test('should send request to delete the object permissions', async () => {
    await insertOrganisations();
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      handler,
      body: {
        id: 'file-id-1',
        organisationId,
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
        ],
      },
    });

    expect(response.status).toBe(200);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'dropbox/data_protection.delete_object_permission.requested',
        data: {
          id: 'file-id-1',
          organisationId: '00000000-0000-0000-0000-000000000001',
          metadata: {
            isPersonal: true,
            ownerId: 'team-member-id-1',
            type: 'file',
          },
          permission: {
            id: 'permission-id-1',
            metadata: {
              sharedLinks: ['https://dropbox.com/link-1', 'https://dropbox.com/link-2'],
            },
          },
        },
      },
    ]);
  });
});
