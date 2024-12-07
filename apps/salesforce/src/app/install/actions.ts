'use server';

import { getRedirectUrl } from '@elba-security/sdk';
import { redirect, RedirectType } from 'next/navigation';
import { env } from '@/common/env/server';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { nangoAPIClient } from '@/common/nango/api';
import { getAuthUser } from '@/connectors/salesforce/users';

export const setupOrganisation = async ({
  organisationId,
  region,
}: {
  organisationId: string;
  region: string;
}) => {
  const { credentials } = await nangoAPIClient.getConnection(organisationId);
  if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
    throw new Error('Could not retrieve Nango credentials');
  }
  const instanceUrl = credentials.raw.instance_url as string;

  await getAuthUser({ accessToken: credentials.access_token, instanceUrl });

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: { region },
    });

  await inngest.send([
    {
      name: 'salesforce/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: 0,
      },
    },
    {
      name: 'salesforce/app.installed',
      data: {
        organisationId,
      },
    },
  ]);

  redirect(
    getRedirectUrl({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    }),
    RedirectType.replace
  );
};
