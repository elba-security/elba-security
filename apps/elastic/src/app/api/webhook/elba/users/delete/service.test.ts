import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteUsers } from './service';

const mockedDate = '2023-01-01T00:00:00.000Z';
const userIds = 'test-user1-id,test-user2-id';
const organisationId = '00000000-0000-0000-0000-000000000002';

describe('elastic/users.delete.requested', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should send request to delete user', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteUsers({ userIds, organisationId });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        data: {
          organisationId,
          userIds,
        },
        name: 'elastic/users.delete.requested',
      },
    ]);
  });
});
