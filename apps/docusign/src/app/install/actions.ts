'use server';

import { getRedirectUrl } from '@elba-security/sdk';
import { redirect, RedirectType } from 'next/navigation';
import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  connectionId: string;
  region: string;
};

export const setupOrganisation = async ({
  organisationId,
  connectionId,
  region,
}: SetupOrganisationParams) => {
  await db
    .insert(organisationsTable)
    .values({
      id: organisationId,
      connectionId,
      region,
    })
    .onConflictDoUpdate({
      target: organisationsTable.id,
      set: {
        connectionId,
        region,
      },
    });

  await inngest.send([
    {
      name: 'docusign/users.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: Date.now(),
        page: null,
      },
    },
    {
      name: 'docusign/app.installed',
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
