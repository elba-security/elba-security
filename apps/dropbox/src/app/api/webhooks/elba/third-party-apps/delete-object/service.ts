import { inngest } from '@/common/clients/inngest';
import { db, tokens } from '@/database';
import { eq } from 'drizzle-orm';

type RefreshThirdPartyAppsObject = {
  organisationId: string;
  userId: string;
  appId: string;
};

export const deleteThirdPartyAppsObject = async ({
  organisationId,
  userId: teamMemberId,
  appId,
}: RefreshThirdPartyAppsObject) => {
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

  await inngest.send({
    name: 'third-party-apps/delete-object',
    data: {
      accessToken,
      organisationId,
      teamMemberId,
      appId,
    },
  });

  return {
    success: true,
  };
};
