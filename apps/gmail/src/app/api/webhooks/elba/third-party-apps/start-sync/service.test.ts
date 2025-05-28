import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { startThirdPartyAppsSync } from './service';

const now = '2023-01-01T00:00:00.000Z';

describe('start-third-party-apps-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should request third party apps sync when the organisation is registered', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await db.insert(organisationsTable).values({
      id: 'e348223e-5d9e-42ec-a66c-7b5017d60553',
      region: 'us',
      googleAdminEmail: 'admin@google.com',
      googleCustomerId: 'customer-id',
      lastSyncStartedAt: null,
    });
    await startThirdPartyAppsSync('e348223e-5d9e-42ec-a66c-7b5017d60553');
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        lastSyncStartedAt: null,
        googleAdminEmail: 'admin@google.com',
        googleCustomerId: 'customer-id',
        organisationId: 'e348223e-5d9e-42ec-a66c-7b5017d60553',
        pageToken: null,
        region: 'us',
        syncStartedAt: '2023-01-01T00:00:00.000Z',
      },
      name: 'gmail/third_party_apps.sync.requested',
    });
  });

  it('should not request third party apps sync when the organisation is nit registered', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(
      startThirdPartyAppsSync('e348223e-5d9e-42ec-a66c-7b5017d60553')
    ).rejects.toThrowError();

    expect(send).toBeCalledTimes(0);
  });
});
