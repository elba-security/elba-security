import { team } from 'dropbox';
import { ThirdPartyAppsObject } from '@elba-security/sdk';

export const formatThirdPartyObjects = (memberLinkedApps: team.MemberLinkedApps[]) => {
  const thirdPartyApps = new Map<string, ThirdPartyAppsObject>();

  for (const { team_member_id, linked_api_apps } of memberLinkedApps) {
    for (const { app_id, app_name, linked, publisher, publisher_url } of linked_api_apps) {
      const thirdPartyApp = thirdPartyApps.get(app_id);

      if (thirdPartyApp) {
        thirdPartyApp.users.push({
          id: team_member_id,
          ...(linked && { createdAt: linked }),
          scopes: [],
        });
      } else {
        thirdPartyApps.set(app_id, {
          id: app_id,
          name: app_name,
          ...(publisher && { publisherName: publisher }),
          ...(publisher_url && { url: publisher_url }),
          users: [
            {
              id: team_member_id,
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
