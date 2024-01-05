import { inngest } from '@/common/clients/inngest';
import { db, tokens } from '@/database';
import { eq } from 'drizzle-orm';

export const triggerThirdPartyScan = async (organisationId: string) => {
  if (!organisationId) {
    throw new Error(`Missing organisationId`);
  }

  const [organisation] = await db
    .select({
      accessToken: tokens.accessToken,
    })
    .from(tokens)
    .where(eq(tokens.organisationId, organisationId));

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }

  const { accessToken } = organisation;
  const syncStartedAt = new Date().toISOString();

  await inngest.send({
    name: 'third-party-apps/run-sync-jobs',
    data: {
      accessToken,
      organisationId,
      isFirstScan: true,
      syncStartedAt,
    },
  });

  return {
    success: true,
  };
};
