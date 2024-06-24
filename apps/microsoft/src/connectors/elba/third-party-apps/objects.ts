import type { ThirdPartyAppsObjectUser } from '@elba-security/sdk';
import type {
  MicrosoftAppPermission,
  MicrosoftAppWithOauthGrants,
} from '@/connectors/microsoft/apps';
import type { AppUserMetadata } from './metadata';

type ValidMicrosoftAppRolePermission = { id: string; principalId: string };

const isValidAppRolePermission = (
  appRole: MicrosoftAppPermission
): appRole is ValidMicrosoftAppRolePermission =>
  Boolean(appRole.principalId) && Boolean(appRole.id);

const mergeScopes = (a: string[], b: string[]) =>
  [...a, ...b].filter((scope, i, scopes) => scopes.indexOf(scope) === i);

/**
 * As noted on this documentation {@link https://learn.microsoft.com/en-us/graph/api/oauth2permissiongrant-delete?view=graph-rest-1.0&tabs=http}
 * "There may be two delegated permission grants authorizing an application to act on behalf
 *  of a user when calling an API. This can happen when a user consents for the application
 *  on their own behalf (creating an oAuth2PermissionGrant with consentType Principal, identifying the user)
 *  and then an administrator grants tenant-wide admin consent on behalf of all users
 *  (creating a second oAuth2PermissionGrant with consentType of AllPrincipals)."
 *
 * So we can expect a permission by assignement when a user install an app without SSO (example: from marketplace)
 * and a maximum of two grant ids when the user use the app with Microsoft SSO.
 */
const formatAppUsers = (app: MicrosoftAppWithOauthGrants): ThirdPartyAppsObjectUser[] => {
  const users = new Map<
    string,
    Omit<ThirdPartyAppsObjectUser, 'metadata'> & { metadata: AppUserMetadata }
  >();

  // add users directly assigned to the app
  for (const appRole of app.appRoleAssignedTo) {
    if (!isValidAppRolePermission(appRole)) {
      continue;
    }

    users.set(appRole.principalId, {
      id: appRole.principalId,
      scopes: app.oauth2PermissionScopes,
      metadata: { permissionId: appRole.id },
    });
  }

  // add users that use the app with Microsoft SSO
  for (const oauthGrant of app.oauthGrants) {
    const user = users.get(oauthGrant.principalId);
    const formattedScopes = oauthGrant.scope.trim().split(' ');

    if (user) {
      user.scopes = mergeScopes(user.scopes, formattedScopes);
      user.metadata.oauthGrantIds = user.metadata.oauthGrantIds
        ? [...user.metadata.oauthGrantIds, oauthGrant.id]
        : [oauthGrant.id];
    } else {
      users.set(oauthGrant.principalId, {
        id: oauthGrant.principalId,
        scopes: formattedScopes,
        metadata: {
          oauthGrantIds: [oauthGrant.id],
        },
      });
    }
  }

  return Array.from(users.values());
};

export const formatApp = (app: MicrosoftAppWithOauthGrants) => ({
  id: app.id,
  name: app.appDisplayName,
  description: app.description ?? undefined,
  url: app.homepage ?? undefined,
  logoUrl: app.info?.logoUrl ?? undefined,
  publisherName: app.verifiedPublisher?.displayName ?? undefined,
  users: formatAppUsers(app),
});
