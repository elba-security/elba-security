import { expect, test, describe, vi } from 'vitest';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { inngest } from '@/inngest/client';
import { insertOrganisations } from '@/test-utils/token';
import { POST as handler } from './route';

const organisationId = '00000000-0000-0000-0000-000000000001';

describe('refreshObject', () => {
  test('should send request to refresh object', async () => {
    await insertOrganisations();
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      handler,
      body: {
        id: 'file-id-1',
        organisationId,
        metadata: {
          ownerId: 'team-member-id-1',
          type: 'file',
          isPersonal: true,
        },
      },
    });

    expect(response.status).toBe(200);
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
