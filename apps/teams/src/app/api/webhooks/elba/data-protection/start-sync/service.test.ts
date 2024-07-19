import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { startDataProtectionSync } from '@/app/api/webhooks/elba/data-protection/start-sync/service';

const organisationId = '98449620-9738-4a9c-8db0-1e4ef5a6a9e8';

describe('startDataProtectionSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should start data protection sync', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    const date = new Date(2024, 3, 2, 12).toISOString();
    vi.setSystemTime(date);

    await expect(startDataProtectionSync(organisationId)).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'teams/teams.sync.requested',
        data: {
          organisationId,
          syncStartedAt: date,
          skipToken: null,
          isFirstSync: true,
        },
      },
      {
        name: 'teams/channels.subscription.requested',
        data: {
          organisationId,
        },
      },
    ]);
  });
});
