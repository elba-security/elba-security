import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import type { GoogleToken } from '../google/tokens';

export const formatApps = (
  userApps: { userId: string; apps: GoogleToken[] }[]
): ThirdPartyAppsObject[] => {
  const usersApps = new Map<string, ThirdPartyAppsObject>();
  for (const { userId, apps } of userApps) {
    for (const { clientId, displayText, scopes } of apps) {
      const app = usersApps.get(clientId);
      if (app) {
        app.users.push({ id: userId, scopes });
      } else {
        usersApps.set(clientId, {
          id: clientId,
          name: displayText,
          users: [
            {
              id: userId,
              scopes,
            },
          ],
        });
      }
    }
  }

  return [...usersApps.values()];
};
