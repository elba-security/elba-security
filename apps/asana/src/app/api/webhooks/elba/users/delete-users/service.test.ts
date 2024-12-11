import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUsers } from './service';

const userId1 = 'test-user-id1';
const userId2 = 'test-user-id2';
const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

describe('asana/users.delete.requested', () => {
  it('should send request to delete users', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await deleteUsers({ userIds: [userId1, userId2], organisationId, nangoConnectionId, region });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'asana/users.delete.requested',
        data: {
          region,
          organisationId,
          nangoConnectionId,
          userId: userId1,
        },
      },
      {
        name: 'asana/users.delete.requested',
        data: {
          region,
          organisationId,
          nangoConnectionId,
          userId: userId2,
        },
      },
    ]);
  });
});
