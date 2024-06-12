import { expect, test, describe, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { DELETE as handler } from './route';

const organisationId = '00000000-0000-0000-0000-000000000001';

describe('deleteUserRequest', () => {
  test('should send request to delete user', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    const response = await mockNextRequest({
      handler,
      body: {
        ids: ['user-id-1'],
        organisationId,
      },
    });

    expect(response.status).toBe(200);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'webflow/users.delete.requested',
      data: {
        ids: ['user-id-1'],
        organisationId,
      },
    });
  });
});