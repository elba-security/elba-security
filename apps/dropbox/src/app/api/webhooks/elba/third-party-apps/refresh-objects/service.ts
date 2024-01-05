import { inngest } from '@/common/clients/inngest';
import { db, tokens } from '@/database';
import { eq } from 'drizzle-orm';

type RefreshThirdPartyAppsObject = {
  organisationId: string;
  userId: string;
};

export const refreshThirdPartyAppsObject = async ({
  organisationId,
  userId: teamMemberId,
}: RefreshThirdPartyAppsObject) => {
  if (!organisationId || !teamMemberId) {
    throw new Error('Missing organisationId or teamMemberId');
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

  await inngest.send({
    name: 'third-party-apps/refresh-objects',
    data: {
      accessToken: organisation.accessToken,
      organisationId,
      teamMemberId,
      isFirstScan: false,
    },
  });

  return {
    success: true,
  };
};
