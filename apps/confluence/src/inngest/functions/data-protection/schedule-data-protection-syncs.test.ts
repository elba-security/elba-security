import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { scheduleDataProtectionSyncs } from './schedule-data-protection-syncs';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleDataProtectionSyncs);

describe('schedule-data-protection-syncs', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  test('should not schedule any jobs when there are no organisations', async () => {
    const elba = spyOnElba();
    elba.mockImplementation(() => ({
      // @ts-expect-error -- this is a mock
      organisations: {
        list: vi.fn().mockResolvedValue({ organisations: [] }),
      },
    }));
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule syncs when there are organisations', async () => {
    const elba = spyOnElba();
    const regionOrganisations = new Map(
      ['eu', 'us'].map((region) => [
        region,
        [{ id: `organisation-id-${region}`, nangoConnectionId: `nango-connection-id-${region}` }],
      ])
    );
    elba.mockImplementation(({ region }) => ({
      // @ts-expect-error -- this is a mock
      organisations: {
        list: vi.fn().mockResolvedValue({
          organisations: regionOrganisations.get(region) || [],
        }),
      },
    }));

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: [...regionOrganisations].flatMap(([region, organisations]) =>
        organisations.map((organisation) => ({
          organisationId: organisation.id,
          nangoConnectionId: organisation.nangoConnectionId,
          region,
        }))
      ),
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'request-data-protection-syncs',
      [...regionOrganisations].flatMap(([region, organisations]) =>
        organisations.map(({ id: organisationId, nangoConnectionId }) => ({
          name: 'confluence/data_protection.spaces.sync.requested',
          data: {
            organisationId,
            isFirstSync: false,
            syncStartedAt: Date.now(),
            cursor: null,
            type: 'global',
            nangoConnectionId,
            region,
          },
        }))
      )
    );
  });
});
