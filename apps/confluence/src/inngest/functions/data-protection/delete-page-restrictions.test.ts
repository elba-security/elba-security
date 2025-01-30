import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as pageRestrictionsConnector from '@/connectors/confluence/page-restrictions';
import * as nangoAPI from '@/common/nango';
import * as authConnector from '@/connectors/confluence/auth';
import { accessToken } from '../__mocks__/organisations';
import { deletePageRestrictions } from './delete-page-restrictions';

const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const instanceId = 'test-instance-id';

const pageId = 'page-id';
const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);

const setup = createInngestFunctionMock(
  deletePageRestrictions,
  'confluence/data_protection.delete_page_restrictions.requested'
);

describe('delete-page-restrictions', () => {
  test('should delete page restrictions', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
      id: 'test-instance-id',
      url: 'test-instance-url',
    });
    vi.spyOn(pageRestrictionsConnector, 'deletePageUserRestrictions').mockResolvedValue();
    const [result] = setup({
      organisationId,
      pageId,
      userIds,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();
    expect(pageRestrictionsConnector.deletePageUserRestrictions).toBeCalledTimes(userIds.length);
    for (let i = 0; i < userIds.length; i++) {
      expect(pageRestrictionsConnector.deletePageUserRestrictions).toHaveBeenNthCalledWith(i + 1, {
        accessToken,
        instanceId,
        pageId,
        userId: `user-${i}`,
      });
    }
  });
});
