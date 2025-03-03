import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { scheduleAppsSync } from './schedule-apps-sync';

const now = new Date('2021-01-01T00:00:00.000Z').getTime();

const setup = createInngestFunctionMock(scheduleAppsSync);

describe('scheduleAppSync', () => {
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

  test('should schedule third party apps sync jobs for available organisations', async () => {
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
      'sync-apps',
      [...regionOrganisations].flatMap(([region, organisations]) =>
        organisations.map(({ id: organisationId, nangoConnectionId }) => ({
          name: 'dropbox/third_party_apps.sync.requested',
          data: {
            region,
            organisationId,
            nangoConnectionId,
            isFirstSync: false,
            syncStartedAt: 1609459200000,
            cursor: null,
          },
        }))
      )
    );
  });
});
