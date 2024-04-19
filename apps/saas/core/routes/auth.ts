import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';
import { addSeconds } from 'date-fns';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { filterFields } from '../database/utils';
import type { CreateElbaRouteHandler } from './types';

export const preferredRegion = 'cle1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const inputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export const createAuthRoute: CreateElbaRouteHandler =
  (config, inngest) => async (request: NextRequest) => {
    const { db, organisationsTable } = config.database;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- ent
    const auth = config.routes!.auth!;
    const regionParam = request.nextUrl.searchParams.get('region');
    try {
      const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
      const { organisationId, region } = inputSchema.parse({
        organisationId: request.cookies.get('organisation_id')?.value,
        region: request.cookies.get('region')?.value,
      });

      const paramsResult = auth.searchParamsSchema.safeParse(searchParams);

      if (!paramsResult.success) {
        logger.error(`Could not validate search params`, {
          organisationId,
          region,
          searchParams,
          parseError: paramsResult.error,
        });
        redirect(
          getRedirectUrl({
            sourceId: config.elba.sourceId,
            baseUrl: config.elba.redirectUrl,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- todo redirect to error page
            region: regionParam!,
            error: 'unauthorized',
          })
        );
      }

      if (
        auth.withState &&
        (!searchParams.state || searchParams.state !== request.cookies.get('state')?.value)
      ) {
        logger.error(`Could not validate state`, {
          organisationId,
          region,
          searchParams,
        });
        redirect(
          getRedirectUrl({
            sourceId: config.elba.sourceId,
            baseUrl: config.elba.redirectUrl,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- todo redirect to error page
            region: regionParam!,
            error: 'unauthorized',
          })
        );
      }

      const { tokenExpiresIn, organisation } = await auth.handle(paramsResult);
      const partialOrganisation = filterFields(organisation, organisationsTable);

      await db
        .insert(organisationsTable)
        .values({
          ...partialOrganisation,
          id: organisationId,
          region,
        })
        .onConflictDoUpdate({
          target: organisationsTable.id,
          set: partialOrganisation,
        });

      const events: Parameters<typeof inngest.send>[0] = [];

      if (auth.experimental_emitEvents) {
        const additionnalEvents = auth.experimental_emitEvents({
          ...partialOrganisation,
          id: organisationId,
          region,
        }) as Parameters<typeof inngest.send>[0];
        if (additionnalEvents instanceof Array) {
          events.push(...additionnalEvents);
        } else {
          events.push(additionnalEvents);
        }
      }

      if (tokenExpiresIn) {
        events.push({
          name: `${config.id}/token.refresh.requested`,
          data: {
            organisationId,
            expiresAt: addSeconds(new Date(), tokenExpiresIn).getTime(),
          },
        });
      }

      if (config.features?.users?.getUsers) {
        events.push({
          name: `${config.id}/users.sync.requested`,
          data: {
            organisationId,
            syncStartedAt: Date.now(),
            isFirstSync: true,
            cursor: null,
          },
        });
      }

      if (events.length > 0) {
        await inngest.send(events);
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }
      logger.warn('Could not setup organisation', {
        error,
      });
      // todo redirect to elba
      redirect(
        getRedirectUrl({
          sourceId: config.elba.sourceId,
          baseUrl: config.elba.redirectUrl,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- todo redirect to error page
          region: regionParam!,
          error: 'internal_error',
        })
      );
    }

    redirect(
      getRedirectUrl({
        sourceId: config.elba.sourceId,
        baseUrl: config.elba.redirectUrl,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- todo redirect to error page
        region: regionParam!,
      })
    );
  };
