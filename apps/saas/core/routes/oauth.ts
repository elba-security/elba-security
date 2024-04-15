import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { getRedirectUrl } from '@elba-security/sdk';
import { addSeconds } from 'date-fns';
import type { BaseElbaOrganisation, Config } from '../config';
import type { ElbaInngest } from '../inngest/client';

export const preferredRegion = 'cle1';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const inputSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(1),
});

export const createOauthRoute =
  <Organisation extends BaseElbaOrganisation, SearchParamsSchema extends z.AnyZodObject>(
    config: Config<Organisation, SearchParamsSchema>,
    inngest: ElbaInngest
  ) =>
  async (request: NextRequest) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- ent
    const auth = config.routes!.auth!;
    const regionParam = request.nextUrl.searchParams.get('region');
    try {
      const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
      const { organisationId, region } = inputSchema.parse({
        organisationId: request.cookies.get('organisation_id'),
        region: request.cookies.get('region'),
      });

      const paramsResult = auth.searchParamsSchema.parse(searchParams);

      if (!paramsResult.success) {
        //  todo: error unauthorized + log
        return;
      }

      const { expiresIn, organisation } = await auth.authenticate(paramsResult);

      await config.database.organisations.insertOne({
        id: organisationId,
        region,
        ...organisation,
      });

      const events: Parameters<typeof inngest.send>[0] = [
        {
          name: `${config.id}/users.sync.requested`,
          data: {
            organisationId,
            syncStartedAt: Date.now(),
            isFirstSync: true,
            cursor: null,
          },
        },
      ];

      if (expiresIn) {
        events.push({
          name: `${config.id}/token.refresh.requested`,
          data: {
            organisationId,
            expiresAt: addSeconds(new Date(), expiresIn).getTime(),
          },
        });
      }

      await inngest.send(events);
    } catch (error) {
      logger.warn('Could not setup organisation', {
        error,
      });
      // todo redirect to elba
      redirect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- todo redirect to error page
        getRedirectUrl({ sourceId, baseUrl, region: regionParam!, error: 'internal_error' })
      );
    }
    // todo redirect to elba
    redirect(url.toString());
  };
