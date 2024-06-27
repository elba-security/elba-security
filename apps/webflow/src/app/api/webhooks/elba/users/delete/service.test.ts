import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUserRequest } from './service';

const userId1 = 'test-user-id1';
const userId2 = 'test-user-id2';
const organisationId = '00000000-0000-0000-0000-000000000002';

describe('webflow/users.delete.requested', () => {
  it('should send request to delete user', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteUserRequest({ userIds: [userId1, userId2], organisationId });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        data: {
          organisationId,
          userId: userId1,
        },
        name: 'webflow/users.delete.requested',
      },
      {
        data: {
          organisationId,
          userId: userId2,
        },
        name: 'webflow/users.delete.requested',
      },
    ]);
  });
});
