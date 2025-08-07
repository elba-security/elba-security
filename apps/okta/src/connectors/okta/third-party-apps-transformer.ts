import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import type { OktaGrant, OktaApplication } from './third-party-apps';
import { getApplication } from './third-party-apps';

type FormatThirdPartyAppsParams = {
  grants: { userId: string; grants: OktaGrant[] }[];
  token: string;
  subDomain: string;
};

export async function formatThirdPartyApps({
  grants,
  token,
  subDomain,
}: FormatThirdPartyAppsParams): Promise<ThirdPartyAppsObject[]> {
  // Group grants by clientId
  const grantsByApp = new Map<string, { grant: OktaGrant; userId: string }[]>();

  for (const userGrants of grants) {
    for (const grant of userGrants.grants) {
      const existing = grantsByApp.get(grant.clientId) || [];
      grantsByApp.set(grant.clientId, [...existing, { grant, userId: userGrants.userId }]);
    }
  }

  // Fetch app details and format for Elba
  const apps: ThirdPartyAppsObject[] = [];
  const appCache = new Map<string, OktaApplication | null>();

  for (const [clientId, appGrants] of grantsByApp.entries()) {
    try {
      // Try to get app details from cache or fetch it
      let app = appCache.get(clientId);
      if (app === undefined) {
        try {
          app = await getApplication({ token, subDomain, appId: clientId });
          appCache.set(clientId, app);
        } catch (error) {
          // Cache null if app fetch fails
          appCache.set(clientId, null);
          app = null;
        }
      }

      // If we couldn't get app details, try to use info from grant links
      const appName =
        app?.label || app?.name || appGrants[0]?.grant._links?.client?.title || clientId;
      const appUrl =
        app?._links.self.href ||
        appGrants[0]?.grant._links?.client?.href ||
        `https://${subDomain}.okta.com/admin/app/${clientId}/instance`;

      // Group scopes by user
      const userScopesMap = new Map<string, { scopes: string[]; createdAt: string }>();

      for (const { grant, userId } of appGrants) {
        const existing = userScopesMap.get(userId);
        if (existing) {
          existing.scopes.push(grant.scopeId);
        } else {
          userScopesMap.set(userId, {
            scopes: [grant.scopeId],
            createdAt: grant.created,
          });
        }
      }

      const thirdPartyApp: ThirdPartyAppsObject = {
        id: clientId,
        name: appName,
        url: appUrl,
        users: Array.from(userScopesMap.entries()).map(([userId, { scopes, createdAt }]) => ({
          id: userId,
          scopes,
          createdAt,
        })),
      };

      apps.push(thirdPartyApp);
    } catch (error) {
      // Skip apps that fail to process
    }
  }

  return apps;
}
