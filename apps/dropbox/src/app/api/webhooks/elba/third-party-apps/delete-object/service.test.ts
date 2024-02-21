import { expect, test, describe, vi } from 'vitest';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { inngest } from '@/inngest/client';
import { insertOrganisations } from '@/test-utils/token';
import { POST as handler } from './route';

const organisationId = '00000000-0000-0000-0000-000000000001';
const userId = 'team-member-id-1';
const appId = 'app-id-1';

describe('deleteThirdPartyAppsObject', () => {
  test('should send request to delete third party objects', async () => {
    await insertOrganisations();
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      handler,
      body: {
        organisationId,
        userId,
        appId,
      },
    });

    expect(response.status).toBe(200);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'dropbox/third_party_apps.delete_object.requested',
      data: {
        organisationId,
        userId,
        appId,
      },
    });
  });
});
