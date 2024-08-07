import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUsers } from './service';

const userIds = ['test-user-id1', 'test-user-id2'];
const organisationId = '00000000-0000-0000-0000-000000000002';

describe('docusign/users.delete.requested', () => {
  it('should send request to delete users', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteUsers({ userIds, organisationId });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'docusign/users.delete.requested',
      data: {
        organisationId,
        userIds,
      },
    });
  });
});
