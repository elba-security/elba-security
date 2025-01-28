import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUsers } from './service';

const userId1 = 'test-user-id1';
const userId2 = 'test-user-id2';
const nangoConnectionId = 'nango-connection-id';

describe('dropbox/users.delete.requested', () => {
  it('should send request to delete user', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteUsers({ userIds: [userId1, userId2], nangoConnectionId });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        data: {
          nangoConnectionId,
          userId: userId1,
        },
        name: 'dropbox/users.delete.requested',
      },
      {
        data: {
          nangoConnectionId,
          userId: userId2,
        },
        name: 'dropbox/users.delete.requested',
      },
    ]);
  });
});
