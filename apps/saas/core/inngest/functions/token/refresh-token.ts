import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { NonRetriableError } from 'inngest';
import type { MakeInngestFunctionParams } from '../types';
import type { BaseElbaOrganisation } from '../../../config';
import { decryptOrganisation, encryptOrganisation } from '../../../utils/encryption';

export const createRefreshToken = <T extends BaseElbaOrganisation>({
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
    { event: `${inngest.id}/token.refresh.requested` },
    async ({ event, step }) => {
      const { organisationId, expiresAt } = event.data;

      await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));

      const nextExpiresAt = await step.run('refresh-token', async () => {
        const organisation = await config.database.organisations.getOne(organisationId);

        if (!organisation) {
          throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
        }

        const decryptedOrganisation = await decryptOrganisation(organisation, config);

        const { expiresIn, organisation: updatedOrganisation } =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- convenience
          await config.token!.refreshToken(decryptedOrganisation);

        const encryptedOrganisation = await encryptOrganisation(updatedOrganisation, config);

        await config.database.organisations.updateOne(organisationId, encryptedOrganisation);

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
