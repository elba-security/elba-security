import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import type { MakeInngestFunctionParams } from '../types';
import { decryptOrganisation, encryptOrganisation } from '../../../utils/encryption';
import { filterFields } from '../../../database/utils';

export const createRefreshToken = <T extends string>({
  inngest,
  config,
}: MakeInngestFunctionParams<T>) =>
  inngest.createFunction(
    {
      id: `${inngest.id}-refresh-token`,
      concurrency: {
        key: 'event.data.organisationId',
        limit: 1,
      },
    },
    { event: `${config.id}/token.refresh.requested` },
    async ({ event, step }) => {
      const { organisationId, expiresAt } = event.data;
      const { db, organisationsTable, encryption } = config.database;

      await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 5));

      const nextExpiresAt = await step.run('refresh-token', async () => {
        const [organisation] = await db
          .select()
          .from(organisationsTable)
          .where(eq(organisationsTable.id, organisationId));

        if (!organisation) {
          throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
        }

        const decryptedOrganisation = await decryptOrganisation(organisation, encryption);

        const { expiresIn, organisation: updatedOrganisation } =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- convenience
          await config.features!.token!.refreshToken!(decryptedOrganisation);

        const encryptedOrganisation = await encryptOrganisation(updatedOrganisation, encryption);

        await db
          .update(organisationsTable)
          .set(filterFields(encryptedOrganisation, organisationsTable))
          .where(eq(organisationsTable.id, organisationId));

        return addSeconds(new Date(), expiresIn);
      });

      await step.sendEvent('next-refresh', {
        name: `${inngest.id}/token.refresh.requested`,
        data: {
          organisationId,
          expiresAt: new Date(nextExpiresAt).getTime(),
        },
      });
    }
  );
