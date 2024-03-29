import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { refreshDataProtectionObject } from './service';

describe('refresh-data-protection-object', () => {
  it('Should be ignored if metadata is not valid', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await refreshDataProtectionObject({
      organisationId: 'organisation-id',
      metadata: null,
      objectId: 'object-id',
    });
    expect(send).toBeCalledTimes(0);
  });

  it('Should successfully request data protection object refresh', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await refreshDataProtectionObject({
      organisationId: 'organisation-id',
      metadata: { ownerId: 'owner-id' },
      objectId: 'object-id',
    });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        objectId: 'object-id',
        organisationId: 'organisation-id',
        ownerId: 'owner-id',
      },
      name: 'google/data_protection.refresh_object.requested',
    });
  });
});
