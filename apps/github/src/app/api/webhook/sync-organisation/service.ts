import { eq } from 'drizzle-orm/sql';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';

export const syncOrganisation = async (organisationId: string) => {
  const [organisation] = await db
    .select({
      installationId: Organisation.installationId,
      accountLogin: Organisation.accountLogin,
    })
    .from(Organisation)
    .where(eq(Organisation.id, organisationId));

  if (!organisation) {
    throw new Error(`Could not retrieve an organisation with id=${organisationId}`);
  }

  await inngest.send({
    name: 'third-party-apps/page_sync.requested',
    data: {
      organisationId,
      installationId: organisation.installationId,
      accountLogin: organisation.accountLogin,
      syncStartedAt: Date.now(),
      isFirstSync: true,
      cursor: null,
    },
  });

  return { success: true };
};
