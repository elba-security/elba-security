import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import type { GoogleToken } from '../google/tokens';

const cleanScopes = (scopes: string[]): string[] => {
  return scopes.map((scope) => {
    if (URL.canParse(scope)) {
      const parsed = new URL(scope);

      if (parsed.pathname === '/' && scope.endsWith('/')) {
        return scope;
      }
      return scope.endsWith('/') ? scope.slice(0, -1) : scope;
    }
    return scope;
  });
};

export const formatApps = (
  userApps: { userId: string; apps: GoogleToken[] }[]
): ThirdPartyAppsObject[] => {
  const usersApps = new Map<string, ThirdPartyAppsObject>();
  for (const { userId, apps } of userApps) {
    for (const { clientId, displayText, scopes } of apps) {
      const app = usersApps.get(clientId);
      if (app) {
        app.users.push({ id: userId, scopes: cleanScopes(scopes) });
      } else {
        usersApps.set(clientId, {
          id: clientId,
          name: displayText,
          users: [
            {
              id: userId,
              scopes: cleanScopes(scopes),
            },
          ],
        });
      }
    }
  }

  return [...usersApps.values()];
};
