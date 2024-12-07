import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { messageDelete } from '@/inngest/functions/teams/data-protection/message-delete';

const setup = createInngestFunctionMock(
  messageDelete,
  'teams/data.protection.object.delete.requested'
);

describe('message-delete', () => {
  test('should delete data-protection object from elba', async () => {
    const elba = spyOnElba();
    const [result] = setup({
      organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
      messageId: '23449620-9738-4a9c-8db0-1e4ef5a6a9e8',
      region: 'US',
    });

    await expect(result).resolves.toBeUndefined();

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: ['98449620-9738-4a9c-8db0-1e4ef5a6a9e8:23449620-9738-4a9c-8db0-1e4ef5a6a9e8'],
    });
  });
});
