import { describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import * as appsConnectors from '@/connectors/dropbox/apps';
import { deleteThirdPartyAppsObject } from './delete-object';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const setup = createInngestFunctionMock(
  deleteThirdPartyAppsObject,
  'dropbox/third_party_apps.delete_object.requested'
);

describe('deleteThirdPartyAppsObject', () => {
  test('should delete the member third party app', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(appsConnectors, 'revokeMemberLinkedApp').mockResolvedValue(undefined);

    const [result] = setup({
      organisationId,
      userId: 'team-member-id',
      appId: 'app-id',
      nangoConnectionId,
      region,
    });
    await expect(result).resolves.toBeUndefined();

    expect(appsConnectors.revokeMemberLinkedApp).toBeCalledTimes(1);
    expect(appsConnectors.revokeMemberLinkedApp).toBeCalledWith({
      accessToken: 'access-token',
      teamMemberId: 'team-member-id',
      appId: 'app-id',
    });
  });
});
