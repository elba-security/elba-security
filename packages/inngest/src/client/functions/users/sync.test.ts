import { expect, test, describe, vi, type MockedFunction } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { Inngest } from 'inngest';
import { createElbaUsersSyncFn, type GetUsersFn } from './sync';

const setup = ({ getUsersFn, cursor }: { getUsersFn: GetUsersFn<null, never>; cursor?: string }) =>
  createInngestFunctionMock(
    createElbaUsersSyncFn(
      {
        name: 'integration',
        inngest: new Inngest({ id: 'integration' }) as never,
        sourceId: 'source-id',
        nangoAuthType: null,
        nangoClient: null,
      },
      getUsersFn
    ),
    'integration/users.sync.requested'
  )({
    nangoConnectionId: 'nango-connection-id',
    organisationId: 'organisation-id',
    region: 'eu',
    syncStartedAt: '2025-01-01T00:00:00.000Z',
    cursor,
  });

describe('users-sync', () => {
  test('Should synchronize users and stop when there is no cursor', async () => {
    const getUsersFnMock = (vi.fn() as MockedFunction<GetUsersFn<null, null>>).mockResolvedValue({
      users: [{ id: 'user-id-1', displayName: 'user 1' }],
    });
    const [result, { step }] = setup({ getUsersFn: getUsersFnMock });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(getUsersFnMock).toHaveBeenCalledTimes(1);
    expect(getUsersFnMock).toHaveBeenCalledWith({
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
      syncStartedAt: '2025-01-01T00:00:00.000Z',
    });

    expect(step.sendEvent).toHaveBeenCalledTimes(2);
    expect(step.sendEvent).toHaveBeenNthCalledWith(1, 'update-users', {
      data: {
        organisationId: 'organisation-id',
        sourceId: 'source-id',
        users: [{ displayName: 'user 1', id: 'user-id-1' }],
      },
      name: 'eu/elba/users.updated',
    });
    expect(step.sendEvent).toHaveBeenNthCalledWith(2, 'delete-users-synced-before', {
      data: {
        organisationId: 'organisation-id',
        sourceId: 'source-id',
        syncedBefore: '2025-01-01T00:00:00.000Z',
      },
      name: 'eu/elba/users.deleted',
    });
  });

  test('Should synchronize users and continue when there is a new cursor', async () => {
    const getUsersFnMock = (vi.fn() as MockedFunction<GetUsersFn<null, string>>).mockResolvedValue({
      users: [{ id: 'user-id-1', displayName: 'user 1' }],
      cursor: 'next-cursor',
    });
    const [result, { step }] = setup({ getUsersFn: getUsersFnMock, cursor: 'cursor' });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.run).toHaveBeenCalledTimes(1);
    expect(step.run).toHaveBeenCalledWith('list-users', expect.any(Function));

    expect(getUsersFnMock).toHaveBeenCalledTimes(1);
    expect(getUsersFnMock).toHaveBeenCalledWith({
      cursor: 'cursor',
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
      syncStartedAt: '2025-01-01T00:00:00.000Z',
    });

    expect(step.sendEvent).toHaveBeenCalledTimes(2);
    expect(step.sendEvent).toHaveBeenNthCalledWith(1, 'update-users', {
      data: {
        organisationId: 'organisation-id',
        sourceId: 'source-id',
        users: [{ id: 'user-id-1', displayName: 'user 1' }],
      },
      name: 'eu/elba/users.updated',
    });
    expect(step.sendEvent).toHaveBeenNthCalledWith(2, 'synchronize-users', {
      data: {
        cursor: 'next-cursor',
        nangoConnectionId: 'nango-connection-id',
        organisationId: 'organisation-id',
        region: 'eu',
        syncStartedAt: '2025-01-01T00:00:00.000Z',
      },
      name: 'integration/users.sync.requested',
    });
  });
});
