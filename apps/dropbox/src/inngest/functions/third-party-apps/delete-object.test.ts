import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { deleteThirdPartyAppsObject } from './delete-object';
import { db, organisations } from '@/database';
import { insertOrganisations } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const organisationId = '00000000-0000-0000-0000-000000000001';
const setup = createInngestFunctionMock(
  deleteThirdPartyAppsObject,
  'dropbox/third_party_apps.delete_object.requested'
);

const mocks = vi.hoisted(() => {
  return {
    teamLinkedAppsRevokeLinkedAppMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-access', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamLinkedAppsRevokeLinkedApp: mocks.teamLinkedAppsRevokeLinkedAppMock,
      };
    }),
  };
});

describe('third-party-apps-delete-objects', () => {
  beforeEach(async () => {
    await db.delete(organisations);
    await insertOrganisations({});
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
    vi.clearAllMocks();
  });

  test('should abort sync when organisation is not registered', async () => {
    mocks.teamLinkedAppsRevokeLinkedAppMock.mockResolvedValue({});

    const elba = spyOnElba();
    const [result, { step }] = await setup({
      organisationId: '00000000-0000-0000-0000-000000000010',
      teamMemberId: 'team-member-id',
      appId: 'app-id',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
    expect(mocks.teamLinkedAppsRevokeLinkedAppMock).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delete the member third party app', async () => {
    mocks.teamLinkedAppsRevokeLinkedAppMock.mockResolvedValue({});

    const [result] = await setup({
      organisationId,
      teamMemberId: 'team-member-id',
      appId: 'app-id',
    });

    await expect(result).resolves.toBeUndefined();

    await expect(mocks.teamLinkedAppsRevokeLinkedAppMock).toBeCalledTimes(1);
  });
});
