import { redirect } from 'next/navigation';
import { encrypt } from '@/common/crypto';
import { getVerification } from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  authEmail: string;
  authKey: string;
  region: string;
  organisationId: string;
};

export const registerOrganisation = async (params: SetupOrganisationParams) => {
  const { organisationId, region, authEmail, authKey } = params;
  if (!authEmail || !authKey) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  const { success } = await getVerification(authEmail, authKey);

  if (!success) {
    throw new Error('Invalid auth email and auth key.');
  }

  const encAuthKey = await encrypt(authKey);
  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      authEmail,
      authKey: encAuthKey,
      region,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        authEmail,
        authKey: encAuthKey,
        region,
      },
    });

  await inngest.send({
    name: 'cloudflare/users.page_sync.requested',
    data: {
      organisationId,
      isFirstSync: true,
      region,
      syncStartedAt: Date.now(),
      page: 1,
    },
  });
};
