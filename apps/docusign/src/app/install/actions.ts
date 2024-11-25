'use server';

import { getRedirectUrl } from '@elba-security/sdk';
import { redirect, RedirectType } from 'next/navigation';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env/server';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getAuthUser } from '@/connectors/docusign/auth';
import { nangoAPIClient } from '@/common/nango/api';
import { DocusignNotAdminError } from '@/connectors/common/error';

export const setupOrganisation = async ({
  organisationId,
  region,
}: {
  organisationId: string;
  region: string;
}) => {
  try {
    const { credentials } = await nangoAPIClient.getConnection(organisationId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new Error('Could not retrieve Nango credentials');
    }
    await getAuthUser(credentials.access_token);

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
  } catch (error) {
    logger.error('An error occurred during installation', { organisationId, error });
    return redirect(error instanceof DocusignNotAdminError ? '/error?error=not_admin' : '/error');
  }

  redirect(
    getRedirectUrl({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
    }),
    RedirectType.replace
  );
};
