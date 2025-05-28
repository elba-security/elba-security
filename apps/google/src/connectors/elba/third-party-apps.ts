import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import type { GoogleToken } from '../google/tokens';

/**
 * openid - openid
 * https://mail.google.com - https://mail.google.com/
 * https://mail.google.com/ - https://mail.google.com/
 * https://mail.google.com/something - https://mail.google.com/something
 * https://mail.google.com/something/ - https://mail.google.com/something
 */

const cleanScopes = (scopes: string[]): string[] => {
  return scopes.map((scope) => {
    if (!URL.canParse(scope)) {
      return scope;
    }

    const url = new URL(scope);

    if (url.pathname === '/') {
      return url.origin + url.pathname;
    }

    const currentPathname = url.pathname;
    const normalizedPathname = currentPathname.endsWith('/')
      ? currentPathname.slice(0, -1)
      : currentPathname;

    return url.origin + normalizedPathname;
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
