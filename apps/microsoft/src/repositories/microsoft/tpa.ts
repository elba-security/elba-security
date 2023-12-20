import { eq } from 'drizzle-orm';
import { getPermissionGrant } from '@/repositories/integration/permission-grant';
import type {
  MicrosoftGraphAPIResponse,
  SafeMicrosoftGraphServicePrincipal,
} from '@/repositories/microsoft/graph-api';
import {
  deletePermissionGrantById,
  getTokenByTenantId,
  getPaginatedServicePrincipalsByTenantId,
} from '@/repositories/microsoft/graph-api';
import { checkOrganization } from '@/common/utils';
import { permissionGrants as PermissionGrantTable } from '@/schemas/permission-grant';
import { db } from '@/lib/db';

const formatThirdPartyAppsObjectUpsertInput = (
  tenantId: string,
  servicePrincipals: MicrosoftGraphAPIResponse<SafeMicrosoftGraphServicePrincipal>
) => ({
  apps: servicePrincipals.value.map((servicePrincipal) =>
    formatServicePrincipalToThirdPartyAppObject(servicePrincipal)
  ),
});

const formatServicePrincipalToThirdPartyAppObject = (
  servicePrincipal: SafeMicrosoftGraphServicePrincipal
) => ({
  id: servicePrincipal.id,
  name: servicePrincipal.appDisplayName,
  description: servicePrincipal.description,
  url: servicePrincipal.homepage,
  logoUrl: servicePrincipal.info?.logoUrl ?? undefined,
  publisherName: servicePrincipal.verifiedPublisher?.displayName,
  users: servicePrincipal.appRoleAssignedTo
    .filter((appRole) => Boolean(appRole.principalId) && Boolean(appRole.id))
    .map((appRole) => ({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we filter out the appRoles without principalId
      id: appRole.principalId!,
      scopes: [],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we filter out the appRoles without id
      metadata: { appRoleId: appRole.id! },
    })),
});

export const scanThirdPartyAppsByTenantId = async ({
  tenantId,
  accessToken,
  pageLink,
}: {
  tenantId: string;
  accessToken: string;
  pageLink: string | undefined;
}) => {
  const servicePrincipals = await getPaginatedServicePrincipalsByTenantId({
    accessToken,
    tenantId,
    pageLink,
  });

  const thirdPartyAppsObjects = formatThirdPartyAppsObjectUpsertInput(tenantId, servicePrincipals);

  const permissionGrantObjects = thirdPartyAppsObjects.apps.flatMap((app) =>
    app.users.map((user) => ({
      tenantId,
      appId: app.id,
      userId: user.id,
      grantId: user.metadata.appRoleId,
    }))
  );
  await db.insert(PermissionGrantTable).values(permissionGrantObjects).onConflictDoNothing();
  return {
    thirdPartyAppsObjects,
    pageLink,
  };
};

export const deletePermissionGrant = async ({
  tenantId,
  userId,
  appId,
  grantId,
}: {
  tenantId: string;
  userId: string;
  appId: string;
  grantId: string;
}) => {
  await checkOrganization(tenantId);
  const { accessToken } = await getTokenByTenantId(tenantId);
  const permissionGrant = await getPermissionGrant({
    tenantId,
    appId,
    userId,
    grantId,
  });
  await deletePermissionGrantById({
    accessToken,
    appId,
    tenantId,
    id: permissionGrant.grantId,
  });
  await db.delete(PermissionGrantTable).where(eq(PermissionGrantTable.id, permissionGrant.id));

  return { message: 'Permission grant deleted' };
};
