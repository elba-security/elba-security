import type { UpdateThirdPartyApps } from '@elba-security/schemas';

export type ThirdPartyAppsObject = UpdateThirdPartyApps['apps'][number];

export type ThirdPartyAppsObjectUser = ThirdPartyAppsObject['users'][number];

export type ThirdPartyAppsUpdateObjectsResult = {
  message: string;
  data: {
    processedApps: number;
    processedUsers: number;
  };
};

export type ThirdPartyAppsDeleteObjectsResult = {
  success: boolean;
};
