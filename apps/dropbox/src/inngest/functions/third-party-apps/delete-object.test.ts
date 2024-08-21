import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as crypto from '@/common/crypto';
import { encrypt } from '@/common/crypto';
import { organisationsTable, type Organisation } from '@/database/schema';
import * as appsConnectors from '@/connectors/dropbox/apps';
import { db } from '@/database/client';
import { deleteThirdPartyAppsObject } from './delete-object';

const accessToken = 'test-access-token';
const refreshToken = 'test-refresh-token';

const organisation: Omit<Organisation, 'createdAt'> = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  adminTeamMemberId: 'admin-team-member-id',
  rootNamespaceId: 'root-namespace-id',
  region: 'us',
};

const setup = createInngestFunctionMock(
  deleteThirdPartyAppsObject,
  'dropbox/third_party_apps.delete_object.requested'
);

describe('deleteThirdPartyAppsObject', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('test-access-token');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(appsConnectors, 'revokeMemberLinkedApp');

    const [result, { step }] = setup({
      organisationId: organisation.id,
      userId: 'team-member-id',
      appId: 'app-id',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(appsConnectors.revokeMemberLinkedApp).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delete the member third party app', async () => {
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(appsConnectors, 'revokeMemberLinkedApp').mockResolvedValue(undefined);

    const [result] = setup({
      organisationId: organisation.id,
      userId: 'team-member-id',
      appId: 'app-id',
    });
    await expect(result).resolves.toBeUndefined();

    expect(appsConnectors.revokeMemberLinkedApp).toBeCalledTimes(1);
    expect(appsConnectors.revokeMemberLinkedApp).toBeCalledWith({
      accessToken,
      teamMemberId: 'team-member-id',
      appId: 'app-id',
    });
  });
});
