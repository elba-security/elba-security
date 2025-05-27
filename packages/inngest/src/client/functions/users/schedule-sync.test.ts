import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { Inngest } from 'inngest';
import { elbaRegions } from '@elba-security/schemas';
import * as elba from '../../elba';
import { createElbaUsersSyncSchedulerFn } from './schedule-sync';

const setup = () =>
  createInngestFunctionMock(
    createElbaUsersSyncSchedulerFn({
      name: 'integration',
      inngest: new Inngest({ id: 'integration' }) as never,
      sourceId: 'source-id',
      nangoAuthType: null,
      nangoClient: null,
    })
  )();

const now = '2025-01-01T00:00:00.000Z';

describe('users-sync-schedule', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(now) });
  });

  test('Should not trigger users sync if there is no organisation', async () => {
    const listOrganisationsMock = vi
      .spyOn(elba, 'referenceElbaFunction')
      .mockImplementation(() => ({
        opts: { functionId: 'mock' },
        fn: () => ({
          organisations: [],
        }),
      }));

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual(undefined);

    expect(step.invoke).toHaveBeenCalledTimes(elbaRegions.length);
    for (const [index, elbaRegion] of elbaRegions.entries()) {
      expect(step.invoke).toHaveBeenCalledWith(`get-${elbaRegion}-organisations`, {
        data: {
          sourceId: 'source-id',
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
        function: listOrganisationsMock.mock.results[index]?.value,
        timeout: '1 minute',
      });
    }

    expect(step.sendEvent).toHaveBeenCalledTimes(0);
  });

  test('Should properly trigger users sync for all organisations', async () => {
    const listOrganisationsMock = vi
      .spyOn(elba, 'referenceElbaFunction')
      .mockImplementation((region) => ({
        opts: { functionId: 'mock' },
        fn: () => ({
          organisations: [{ id: `org-${region}`, nangoConnectionId: `nango-${region}` }],
        }),
      }));

    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual(undefined);

    expect(step.invoke).toHaveBeenCalledTimes(elbaRegions.length);
    for (const [index, elbaRegion] of elbaRegions.entries()) {
      expect(step.invoke).toHaveBeenCalledWith(`get-${elbaRegion}-organisations`, {
        data: {
          sourceId: 'source-id',
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
        function: listOrganisationsMock.mock.results[index]?.value,
        timeout: '1 minute',
      });
    }

    expect(step.sendEvent).toHaveBeenCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith(
      'synchronize-users',
      elbaRegions.map((region) => ({
        data: {
          isFirstSync: false,
          nangoConnectionId: `nango-${region}`,
          organisationId: `org-${region}`,
          region,
          syncStartedAt: now,
        },
        name: 'integration/users.sync.requested',
      }))
    );
  });

  test('Should successfully trigger users sync ignoring failing regions', async () => {
    const listOrganisationsMock = vi
      .spyOn(elba, 'referenceElbaFunction')
      .mockImplementation((region) => ({
        opts: { functionId: 'mock' },
        fn: () => {
          if (region === 'us') {
            throw new Error('Unknown');
          }

          return {
            organisations: [{ id: `org-${region}`, nangoConnectionId: `nango-${region}` }],
          };
        },
      }));
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual(undefined);

    expect(step.invoke).toHaveBeenCalledTimes(elbaRegions.length);
    for (const [index, elbaRegion] of elbaRegions.entries()) {
      expect(step.invoke).toHaveBeenCalledWith(`get-${elbaRegion}-organisations`, {
        data: {
          sourceId: 'source-id',
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
        function: listOrganisationsMock.mock.results[index]?.value,
        timeout: '1 minute',
      });
    }

    expect(step.sendEvent).toHaveBeenCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith(
      'synchronize-users',
      elbaRegions
        .filter((region) => region !== 'us')
        .map((region) => ({
          data: {
            isFirstSync: false,
            nangoConnectionId: `nango-${region}`,
            organisationId: `org-${region}`,
            region,
            syncStartedAt: now,
          },
          name: 'integration/users.sync.requested',
        }))
    );
  });
});
