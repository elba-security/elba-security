import { getRedirectUrl } from '@elba-security/sdk';
import { redirect, RedirectType } from 'next/navigation';
import { encrypt } from '@/common/crypto';
import { getVarification } from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  apiKey: string;
  appKey: string;
  region: string;
  organisationId: string;
};

export const setupOrganisation = async ({
  organisationId,
  apiKey,
  appKey,
  region,
}: SetupOrganisationParams) => {
  const encApiKey = await encrypt(apiKey);
  const encAppKey = await encrypt(appKey);

  await db
    .insert(Organisation)
    .values({
      id: organisationId,
      apiKey: encApiKey,
      appKey: encAppKey,
      region,
    })
    .onConflictDoUpdate({
      target: Organisation.id,
      set: {
        apiKey: encApiKey,
        appKey: encAppKey,
        region,
      },
    });

  await inngest.send({
    name: 'datadog/users.page_sync.requested',
    data: {
      organisationId,
      isFirstSync: true,
      region,
      syncStartedAt: Date.now(),
    },
  });
};

export const registerOrganisation = async (params: SetupOrganisationParams) => {
  const { organisationId, region, apiKey, appKey } = params;
  if (!apiKey || !appKey) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  const { valid } = await getVarification(apiKey);

  if (!apiKey || !appKey || !valid) {
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

  await setupOrganisation({ apiKey, appKey, region, organisationId });

  redirect(
    getRedirectUrl({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    }),
    RedirectType.replace
  );
};
