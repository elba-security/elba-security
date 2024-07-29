import { expect, test, describe, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { refreshDataProtectionObject } from './service';

const organisationId = '00000000-0000-0000-0000-000000000001';

describe('refreshDataProtectionObject', () => {
  test('should send request to refresh object', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await refreshDataProtectionObject({
      id: 'file-id-1',
      organisationId,
      metadata: {
        ownerId: 'team-member-id-1',
        type: 'file',
        isPersonal: true,
      },
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'dropbox/data_protection.refresh_object.requested',
      data: {
        id: 'file-id-1',
        organisationId,
        metadata: {
          ownerId: 'team-member-id-1',
          type: 'file',
          isPersonal: true,
        },
      },
    });
  });
});
