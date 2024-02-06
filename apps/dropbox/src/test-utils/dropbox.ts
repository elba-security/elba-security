import { vi } from 'vitest';

export const testMain = async () => {
  const mocks = vi.hoisted(() => {
    return {
      teamLinkedAppsListMemberLinkedAppsMock: vi.fn(),
      teamLinkedAppsListMembersLinkedAppsMock: vi.fn(),
      teamLinkedAppsRevokeLinkedAppMock: vi.fn(),
    };
  });

  vi.resetModules();

  vi.mock('@/repositories/dropbox/clients/dbx-access', () => {
    const actual = vi.importActual('dropbox');
    return {
      ...actual,
      DBXAccess: vi.fn(() => {
        return {
          setHeaders: vi.fn(),
          teamLinkedAppsListMemberLinkedApps: mocks.teamLinkedAppsListMemberLinkedAppsMock,
          teamLinkedAppsListMembersLinkedApps: mocks.teamLinkedAppsListMembersLinkedAppsMock,
          teamLinkedAppsRevokeLinkedApp: mocks.teamLinkedAppsRevokeLinkedAppMock,
        };
      }),
    };
  });

  return mocks;
};
