import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import type { LinkedApps } from '../dropbox/apps';

export const formatThirdPartyObjects = (apps: LinkedApps[]) => {
  const thirdPartyApps = new Map<string, ThirdPartyAppsObject>();

  for (const { linked_api_apps: linkedApiApps, team_member_id: teamMemberId } of apps) {
    for (const {
      app_id: appId,
      app_name: appName,
      linked,
      publisher,
      publisher_url: publisherUrl,
    } of linkedApiApps) {
      const thirdPartyApp = thirdPartyApps.get(appId);

      if (thirdPartyApp) {
        thirdPartyApp.users.push({
          id: teamMemberId,
          ...(linked && { createdAt: linked }),
          scopes: [],
        });
      } else {
        thirdPartyApps.set(appId, {
          id: appId,
          name: appName,
          ...(publisher && { publisherName: publisher }),
          ...(publisherUrl && { url: publisherUrl }),
          users: [
            {
              id: teamMemberId,
              ...(linked && { createdAt: linked }),
              scopes: [],
            },
          ],
        });
      }
    }
  }

  return thirdPartyApps;
};
