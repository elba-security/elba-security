import { eq } from 'drizzle-orm';
import { inngest } from '@/common/clients/inngest';
import { Organisation } from '@/database/schema';
import { db } from '@/database/client';

type RefreshThirdPartyAppsObject = {
  organisationId: string;
  userId: string;
  appId: string;
};

export const refreshThirdPartyAppsObject = async ({
  organisationId,
  userId,
  appId,
}: RefreshThirdPartyAppsObject) => {

    const [organisation] = await db.select({
        organisationId:  Organisation.id,
    })
    .from(Organisation)
    .where(eq(Organisation.id, organisationId));

    // If the organisation does not exist, throw an error
    if (!organisation) {
        throw new Error(`Could not retrieve an organisation with id=${organisationId}`);
    }

    // Call the inngest event to refresh the third party apps object
    await inngest.send({
        name: 'third-party-apps/refresh-objects',
        data: {
        organisationId,
        userId: userId,
        appId,
        },
    });

    return {
        success: true,
    };
};