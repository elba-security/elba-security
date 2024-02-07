import type { MicrosoftApp, MicrosoftAppPermission } from '@/connectors/microsoft/apps';
import type { AppUserMetadata } from './metadata';

type ValidMicrosoftAppPermission = { id: string; principalId: string };

// TODO change naming to permission
const isValidPermission = (
  // todo retrive schema type
  appRole: MicrosoftAppPermission
): appRole is ValidMicrosoftAppPermission => Boolean(appRole.principalId) && Boolean(appRole.id);

export const formatApp = (app: MicrosoftApp) => ({
  id: app.id,
  name: app.appDisplayName,
  description: app.description ?? undefined,
  url: app.homepage ?? undefined,
  logoUrl: app.info?.logoUrl ?? undefined,
  publisherName: app.verifiedPublisher?.displayName ?? undefined,
  users: app.appRoleAssignedTo.filter(isValidPermission).map((appRole) => ({
    id: appRole.principalId,
    scopes: app.oauth2PermissionScopes,
    metadata: { permissionId: appRole.id } satisfies AppUserMetadata,
  })),
});
