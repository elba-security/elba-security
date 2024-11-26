'use server';

import { getRedirectUrl } from '@elba-security/sdk';
import { redirect, RedirectType } from 'next/navigation';
import { env } from '@/common/env/server';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { nangoAPIClient } from '@/common/nango/api';
import { getAuthUser } from '@/connectors/calendly/users';

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

  const organizationUri = credentials.raw.organization as string;
  await getAuthUser(credentials.access_token);

  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      organizationUri,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: { region },
    });

  await inngest.send([
    {
      name: 'calendly/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'calendly/app.installed',
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
