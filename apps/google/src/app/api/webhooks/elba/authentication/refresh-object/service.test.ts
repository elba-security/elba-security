import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { refreshAuthenticationObject } from './service';

describe('refresh-authentication-object', () => {
  it('Should successfully request authentication object refresh', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await refreshAuthenticationObject({ organisationId: 'organisation-id', userId: 'user-id' });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        organisationId: 'organisation-id',
        userId: 'user-id',
      },
      name: 'google/authentication.refresh_object.requested',
    });
  });
});
