import { describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { startDataProtectionSync } from '@/app/api/webhooks/elba/data-protection/start-sync/service';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

const token = 'token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenantId',
  region: 'us',
  token: encryptedToken,
};

describe('startDataProtectionSync', () => {
  test('should start data protection sync', async () => {
    await db.insert(organisationsTable).values(organisation);

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    const date = new Date(2024, 3, 2, 12).toISOString();
    vi.setSystemTime(date);

    await startDataProtectionSync(organisation.id);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'teams/teams.sync.requested',
        data: {
          organisationId: organisation.id,
          syncStartedAt: date,
          skipToken: null,
          isFirstSync: true,
        },
      },
      {
        name: 'teams/channels.subscription.requested',
        data: {
          organisationId: organisation.id,
          tenantId: organisation.tenantId,
        },
      },
    ]);
  });
});
