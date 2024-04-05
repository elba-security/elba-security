import { getRedirectUrl } from '@elba-security/sdk';
import { redirect, RedirectType } from 'next/navigation';
import { encrypt } from '@/common/crypto';
import { getVarification } from '@/connectors/auth';
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

export const setupOrganisation = async ({
  organisationId,
  authEmail,
  authKey,
  region,
}: SetupOrganisationParams) => {
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

export const registerOrganisation = async (params: SetupOrganisationParams) => {
  const { organisationId, region, authEmail, authKey } = params;
  if (!authEmail || !authKey) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  const { success } = await getVarification(authEmail, authKey);

  if (!authEmail || !authKey || !success) {
    redirect(
      getRedirectUrl({
        region,
        sourceId: env.ELBA_SOURCE_ID,
        baseUrl: env.ELBA_REDIRECT_URL,
        error: 'unauthorized',
      }),
      RedirectType.replace
    );
  }

  await setupOrganisation({ authEmail, authKey, region, organisationId });

  redirect(
    getRedirectUrl({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    }),
    RedirectType.replace
  );
};
