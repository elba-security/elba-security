import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUsers } from './service';

const userId1 = '00000000-0000-0000-0000-000000000001';
const userId2 = '00000000-0000-0000-0000-000000000002';
const organisationId = '00000000-0000-0000-0000-000000000000';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

describe('box/users.delete.requested', () => {
  it('should send request to delete user', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteUsers({ userIds: [userId1, userId2], organisationId, nangoConnectionId, region });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        data: {
          organisationId,
          userId: userId1,
          region,
          nangoConnectionId,
        },
        name: 'box/users.delete.requested',
      },
      {
        data: {
          organisationId,
          userId: userId2,
          region,
          nangoConnectionId,
        },
        name: 'box/users.delete.requested',
      },
    ]);
  });
});
