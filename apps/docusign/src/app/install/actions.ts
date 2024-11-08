'use server';

import { getRedirectUrl } from '@elba-security/sdk';
import { redirect, RedirectType } from 'next/navigation';
import { Nango } from '@nangohq/node';
import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

type SetupOrganisationParams = {
  organisationId: string;
  connectionId: string;
  region: string;
};

export const getSession = async () => {
  console.log({ secret: env.NANGO_SECRET_KEY });
  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY });
  const res = await nango.createConnectSession({
    end_user: {
      id: 'my-unique-user-id',
      email: 'shutup@local.org',
    },
    organization: {
      id: 'my-org-id',
    },
    // end_user: {
    //   id: '1',
    //   email: '',
    //   display_name: '',
    // },
    allowed_integrations: ['docusign-sandbox'],
  });
  console.log(res);
  return res.data.token;
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
