import { inngest } from '@/app/api/inngest/client';
import { getTokenByTenantId } from '@/repositories/microsoft/graph-api';
import { timeout } from '@/common/utils';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';

export const handleMicrosoftAuthCallback = async ({
  tenantId,
  elbaOrganizationId,
  isAdminConsentGiven,
}: {
  tenantId: string | null;
  elbaOrganizationId: string | undefined;
  isAdminConsentGiven: boolean;
}) => {
  if (!isAdminConsentGiven || !tenantId || !elbaOrganizationId) {
    throw new Error('You must give admin consent to continue');
  }
  await timeout(10000);
  const { scopes } = await getTokenByTenantId(tenantId);
  if (
    !scopes.includes('DelegatedPermissionGrant.ReadWrite.All') ||
    !scopes.includes('Application.ReadWrite.All') ||
    !scopes.includes('User.Read.All')
  ) {
    throw new Error("Couldn't retrieve required scopes");
  }
  try {
    await db.insert(organizations).values({ tenantId, elbaOrganizationId }).onConflictDoNothing();
  } catch (error) {
    throw new Error('Something went wrong', { cause: error });
  }
  await inngest.send({
    name: 'users/start',
    data: { tenantId, isFirstScan: true },
  });
  return 'You have successfully given admin consent. You may close this window now.';
};
