import { expect, test, describe, vi, type MockedFunction } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { Inngest } from 'inngest';
import { createElbaUsersDeleteFn, type DeleteUsersConfig, type DeleteUsersFn } from './delete';

const setup = (config: DeleteUsersConfig<null>) =>
  createInngestFunctionMock(
    createElbaUsersDeleteFn(
      {
        name: 'integration',
        inngest: new Inngest({ id: 'integration' }) as never,
        sourceId: 'source-id',
        nangoAuthType: null,
        nangoClient: null,
      },
      config
    ),
    'integration/users.delete.requested'
  )({
    nangoConnectionId: 'nango-connection-id',
    organisationId: 'organisation-id',
    region: 'eu',
    ids: ['user-id-1', 'user-id-2'],
  });

describe('users-deletion', () => {
  test('Should properly delete users one by one when batch is not supported', async () => {
    const deleteUsersFnMock = (
      vi.fn() as MockedFunction<DeleteUsersFn<boolean, null>>
    ).mockResolvedValue();
    const [result, { step }] = setup({
      deleteUsersFn: deleteUsersFnMock,
      isBatchDeleteSupported: false,
    });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(step.run).toHaveBeenCalledTimes(2);
    expect(step.run).toHaveBeenNthCalledWith(1, 'delete-user-user-id-1', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(2, 'delete-user-user-id-2', expect.any(Function));

    expect(deleteUsersFnMock).toHaveBeenCalledTimes(2);
    expect(deleteUsersFnMock).toHaveBeenNthCalledWith(1, {
      id: 'user-id-1',
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
    });
    expect(deleteUsersFnMock).toHaveBeenNthCalledWith(2, {
      id: 'user-id-2',
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
    });
  });

  test('Should properly delete users by batch when supported', async () => {
    const deleteUsersFnMock = (
      vi.fn() as MockedFunction<DeleteUsersFn<boolean, null>>
    ).mockResolvedValue();
    const [result, { step }] = setup({
      deleteUsersFn: deleteUsersFnMock,
      isBatchDeleteSupported: true,
    });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(step.run).toHaveBeenCalledTimes(1);
    expect(step.run).toHaveBeenCalledWith('delete-users-chunk-1', expect.any(Function));

    expect(deleteUsersFnMock).toHaveBeenCalledTimes(1);
    expect(deleteUsersFnMock).toHaveBeenCalledWith({
      ids: ['user-id-1', 'user-id-2'],
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
    });
  });

  test('Should properly delete users by specified batch size when supported', async () => {
    const deleteUsersFnMock = (
      vi.fn() as MockedFunction<DeleteUsersFn<true, null>>
    ).mockResolvedValue();
    const [result, { step }] = setup({
      deleteUsersFn: deleteUsersFnMock,
      isBatchDeleteSupported: true,
      batchSize: 1,
    });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(step.run).toHaveBeenCalledTimes(2);
    expect(step.run).toHaveBeenCalledWith('delete-users-chunk-1', expect.any(Function));
    expect(step.run).toHaveBeenCalledWith('delete-users-chunk-2', expect.any(Function));

    expect(deleteUsersFnMock).toHaveBeenCalledTimes(2);
    expect(deleteUsersFnMock).toHaveBeenCalledWith({
      ids: ['user-id-1'],
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
    });

    expect(deleteUsersFnMock).toHaveBeenCalledWith({
      ids: ['user-id-2'],
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
    });
  });
});
