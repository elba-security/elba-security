import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUsers } from './service';

const userId = 'test-user-id1';
const organisationId = '00000000-0000-0000-0000-000000000002';

describe('asana/users.delete.requested', () => {
  it('should send request to delete user', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteUsers({ userId, organisationId });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        organisationId,
        userId,
      },
      name: 'asana/users.delete.requested',
    });
  });
});
