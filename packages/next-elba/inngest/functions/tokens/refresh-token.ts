import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { addSeconds, subMinutes } from 'date-fns';
import { type ElbaContext } from '../../../types';

export const refreshToken = ({ inngest, config, db, schema }: ElbaContext) =>
  inngest.createFunction(
    {
      id: 'refresh-token',
      cancelOn: [
        {
          event: `${config.name}/app.uninstalled`,
          match: 'event.data.organisationId',
        },
        {
          event: `${config.name}/app.installed`,
          match: 'event.data.organisationId',
        },
      ],
    },
    { event: `${config.name}/token.refresh.requested` },
    async ({ event, step }) => {
      const { expiresAt, organisationId } = event.data;

      await step.sleepUntil('wait-for-token-expires', subMinutes(new Date(expiresAt), 10));

      const [organisation] = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const nextExpiresAt = await step.run('refresh-token', async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it's safe
        const { expiresIn, ...updatedOrganisation } = await config.oauth!.refresh!(organisation);

        await db
          .update(schema.organisations)
          .set(updatedOrganisation)
          .where(eq(schema.organisations.id, organisationId));

        return addSeconds(new Date(), expiresIn);
      });

      await step.sendEvent('send-refresh-token', {
        name: `${config.name}/token.refresh.requested`,
        data: {
          organisationId,
          expiresAt: nextExpiresAt,
        },
      });
    }
  );
