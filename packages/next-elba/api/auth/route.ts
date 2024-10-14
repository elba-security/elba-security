import type { NextRequest } from 'next/server';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { logger } from '@elba-security/logger';
import { type SendEventPayload } from 'inngest/helpers/types';
import { type GetEvents } from 'inngest';
import { addSeconds } from 'date-fns';
import { env } from '../../common/env';
import { type ElbaRoute } from '../types';

const isStateValid = (request: NextRequest) => {
  const stateParam = request.nextUrl.searchParams.get('state');
  const cookieParam = request.cookies.get('state')?.value;
  if (!stateParam || !cookieParam || stateParam !== cookieParam) {
    return false;
  }
  return true;
};

export const auth: ElbaRoute = async (request, { config, db, schema, inngest }) => {
  const code = request.nextUrl.searchParams.get('code');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const region = request.cookies.get('region')?.value;

  if (!isStateValid(request) || !code || !organisationId || !region) {
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it's safe
    const { expiresIn, ...organisation } = await config.oauth!.authorize(code);
    await db
      .insert(schema.organisations)
      .values({ id: organisationId, region, ...organisation })
      .onConflictDoUpdate({
        target: schema.organisations.id,
        set: {
          ...organisation,
          region,
        },
      });

    const events: SendEventPayload<GetEvents<typeof inngest>> = [
      {
        name: `${config.name}/app.installed`,
        data: {
          organisationId,
        },
      },
      {
        name: `${config.name}/users.sync.requested`,
        data: {
          organisationId,
          cursor: null,
          isFirstSync: true,
          syncStartedAt: new Date().toISOString(),
        },
      },
    ];

    if (config.oauth?.refresh) {
      events.push({
        name: `${config.name}/token.refresh.requested`,
        data: {
          organisationId,
          expiresAt: addSeconds(new Date(), expiresIn).toISOString(),
        },
      });
    }

    await inngest.send(events);
  } catch (error) {
    logger.error('Could not setup organisation', { error, organisationId });
    return new ElbaInstallRedirectResponse({
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'internal_error',
    });
  }

  return new ElbaInstallRedirectResponse({
    region,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
  });
};
