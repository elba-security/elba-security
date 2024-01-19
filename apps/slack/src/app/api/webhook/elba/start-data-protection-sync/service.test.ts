import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { startDataProtectionSync } from './service';

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('start-data-protection-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('Should successfully start data protection synchronization', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    await startDataProtectionSync('00000000-0000-0000-0000-000000000001');
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        isFirstSync: true,
        syncStartedAt: mockedDate,
        teamId: 'team-id',
      },
      name: 'conversations/synchronize',
    });
  });
});
