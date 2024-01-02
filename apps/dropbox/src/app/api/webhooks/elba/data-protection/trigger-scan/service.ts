import { inngest } from '@/common/clients/inngest';
import { db, tokens } from '@/database';
import { eq } from 'drizzle-orm';

export const triggerDataProtectionScan = async (organisationId: string) => {
  if (!organisationId) {
    throw new Error(`Missing organisationId`);
  }

  const [organisation] = await db
    .select({
      organisationId: tokens.organisationId,
      accessToken: tokens.accessToken,
      pathRoot: tokens.rootNamespaceId,
      adminTeamMemberId: tokens.adminTeamMemberId,
    })
    .from(tokens)
    .where(eq(tokens.organisationId, organisationId));

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }

  const { accessToken, adminTeamMemberId, pathRoot } = organisation;
  const syncStartedAt = new Date().toISOString();

  await inngest.send({
    name: 'data-protection/create-shared-link-sync-jobs',
    data: {
      accessToken,
      adminTeamMemberId,
      organisationId,
      pathRoot,
      isFirstScan: true,
      syncStartedAt,
    },
  });

  return {
    success: true,
  };
};
