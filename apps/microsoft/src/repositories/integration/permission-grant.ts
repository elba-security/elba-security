import { and, eq } from 'drizzle-orm';
import { permissionGrants } from '@/schemas/permission-grant';
import { db } from '@/lib/db';

export const getPermissionGrant = async ({
  tenantId,
  appId,
  userId,
  grantId,
}: {
  tenantId: string;
  appId: string;
  userId: string;
  grantId: string;
}) => {
  const result = (
    await db
      .select()
      .from(permissionGrants)
      .where(
        and(
          eq(permissionGrants.tenantId, tenantId),
          eq(permissionGrants.userId, userId),
          eq(permissionGrants.appId, appId),
          eq(permissionGrants.grantId, grantId)
        )
      )
  )[0];
  if (!result) {
    throw new Error('Permission grant not found');
  }
  return result;
};
