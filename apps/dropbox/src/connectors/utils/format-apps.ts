import type { team } from 'dropbox';
import type { ThirdPartyAppsObject } from '@elba-security/sdk';

export const formatThirdPartyObjects = (memberLinkedApps: team.MemberLinkedApps[]) => {
  const thirdPartyApps = new Map<string, ThirdPartyAppsObject>();

  for (const { team_member_id: teamMemberId, linked_api_apps: apps } of memberLinkedApps) {
    for (const {
      app_id: appId,
      app_name: appName,
      linked,
      publisher,
      publisher_url: publisherUrl,
    } of apps) {
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
