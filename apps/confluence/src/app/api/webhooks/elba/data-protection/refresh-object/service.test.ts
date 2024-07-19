import { expect, test, describe, vi } from 'vitest';
import { ZodError } from 'zod';
import { inngest } from '@/inngest/client';
import { refreshDataProtectionObject } from './service';

const eventData = {
  organisationId: 'organisation-id',
  id: 'object-id',
  metadata: {
    objectType: 'space',
    type: 'personal',
    key: 'space-key',
  },
};

describe('webhook refreshDataProtectionObject', () => {
  test('should request data protection sync when metadata is valid', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await expect(refreshDataProtectionObject(eventData)).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'confluence/data_protection.refresh_object.requested',
      data: {
        organisationId: eventData.organisationId,
        objectId: eventData.id,
        metadata: eventData.metadata,
      },
    });
  });

  test('should throw when metadata is invalid', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await expect(
      refreshDataProtectionObject({
        ...eventData,
        metadata: {
          foo: 'bar',
        },
      })
    ).rejects.toBeInstanceOf(ZodError);

    expect(send).toBeCalledTimes(0);
  });
});
