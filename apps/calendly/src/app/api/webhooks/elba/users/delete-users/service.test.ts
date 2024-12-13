import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUsers } from './service';

const userIds = ['test-user-id1', 'test-user-id2'];
const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

describe('docusign/users.delete.requested', () => {
  it('should send request to delete users', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteUsers({ userIds, organisationId, nangoConnectionId, region });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        data: {
          nangoConnectionId,
          organisationId: '00000000-0000-0000-0000-000000000002',
          region,
          userId: 'test-user-id1',
        },
        name: 'calendly/users.delete.requested',
      },
      {
        data: {
          nangoConnectionId,
          organisationId: '00000000-0000-0000-0000-000000000002',
          region,
          userId: 'test-user-id2',
        },
        name: 'calendly/users.delete.requested',
      },
    ]);
  });
});
