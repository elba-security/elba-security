import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUsers } from './service';

const userIds = ['test-user-id'];
const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

describe('asana/users.delete.requested', () => {
  it('should send request to delete users', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ id: [] });

    await deleteUsers({ userIds, organisationId, nangoConnectionId, region });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'asana/users.delete.requested',
      data: {
        region,
        organisationId,
        nangoConnectionId,
        userIds,
      },
    });
  });
});
