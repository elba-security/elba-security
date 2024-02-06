import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { deleteThirdPartyAppsObject } from './delete-object';
import { db, organisations } from '@/database';
import { insertOrganisations } from '@/test-utils/token';

const organisationId = '00000000-0000-0000-0000-000000000001';
const setup = createInngestFunctionMock(
  deleteThirdPartyAppsObject,
  'third-party-apps/delete-object'
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
    vi.clearAllMocks();
  });

  test('should delete the member third party app', async () => {
    mocks.teamLinkedAppsRevokeLinkedAppMock.mockResolvedValue({});

    const [result, { step }] = await setup({
      organisationId,
      teamMemberId: 'team-member-id',
      appId: 'app-id',
    });

    expect(await result).toStrictEqual({
      success: true,
    });
    await expect(step.run).toBeCalledTimes(1);
    await expect(mocks.teamLinkedAppsRevokeLinkedAppMock).toBeCalledTimes(1);
  });
});
