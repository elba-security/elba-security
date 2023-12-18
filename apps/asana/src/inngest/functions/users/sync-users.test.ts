import { test, describe } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { syncUsers } from './sync-users';

const setup = createInngestFunctionMock(syncUsers, 'users/sync');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // TODO
  });

  test('should continue the sync when there is a next page', async () => {
    // TODO
  });

  test('should finalize the sync when there is a no next page', async () => {
    // TODO
  });
});
