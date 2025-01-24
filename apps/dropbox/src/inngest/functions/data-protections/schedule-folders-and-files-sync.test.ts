import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { NonRetriableError } from 'inngest';
import { scheduleDataProtectionSync } from './schedule-folders-and-files-sync';

const now = Date.now();

const setup = createInngestFunctionMock(scheduleDataProtectionSync);

describe('scheduleDataProtectionSync', () => {
  beforeEach(() => {
    vi.setSystemTime(now);
  });

  test('should not schedule any jobs when there are no organisations to refresh', async () => {
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

  test('should schedule sync jobs for the available organisations', async () => {
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
      'start-shared-link-sync',
      expect.arrayContaining(
        [...regionOrganisations].flatMap(([region, organisations]) =>
          organisations.map(({ id: organisationId, nangoConnectionId }) => ({
            data: {
              nangoConnectionId,
              region,
              organisationId,
              isFirstSync: false,
              syncStartedAt: now,
              cursor: null,
            },
            name: 'dropbox/data_protection.shared_links.start.sync.requested',
          }))
        )
      )
    );
  });

  test('should schedule jobs and throw an error when there organisation nango connection id is missing', async () => {
    const elba = spyOnElba();
    const regionOrganisations = new Map(
      ['eu', 'us'].map((region) => [
        region,
        [
          {
            id: `organisation-id-${region}`,
            nangoConnectionId: region === 'us' ? null : `nango-connection-id-${region}`,
          },
        ],
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

    await expect(result).rejects.toStrictEqual(
      new NonRetriableError('Failed to schedule folders and files sync due to missing nango connection ID')
    );

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'start-shared-link-sync',
      expect.arrayContaining(
        [...regionOrganisations]
          .filter(([region]) => region !== 'us')
          .flatMap(([region, organisations]) =>
            organisations.map(({ id: organisationId, nangoConnectionId }) => ({
              name: 'dropbox/data_protection.shared_links.start.sync.requested',
              data: {
                region,
                organisationId,
                nangoConnectionId,
                syncStartedAt: now,
                isFirstSync: false,
                cursor: null,
              },
            }))
          )
      )
    );
  });
});
