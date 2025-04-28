import { type InstallationValidationRequestedWebhookData } from '@elba-security/schemas';
import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { getErrorCausedBy, IntegrationConnectionError } from '@elba-security/common';
import { type MaybeNangoAuthType, type ElbaInngestConfig, type ElbaFn } from '../../types';
import { getNangoConnection } from '../../nango';

export type InstallationValidationEvent = {
  'installation.validation.requested': InstallationValidationRequestedWebhookData;
};

export type ValidateInstallationFn<NangoAuthType extends MaybeNangoAuthType> = ElbaFn<
  NangoAuthType,
  InstallationValidationRequestedWebhookData,
  void
>;

export const createInstallationValidateFn = <NangoAuthType extends MaybeNangoAuthType>(
  { name, sourceId, inngest, nangoClient, nangoAuthType }: ElbaInngestConfig,
  validateInstallationFn: ValidateInstallationFn<NangoAuthType>
) => {
  return inngest.createFunction(
    {
      id: `${name}-validate-installation`,
      retries: 5,
    },
    { event: `${name}/installation.validation.requested` },
    async ({ event, step, logger }) => {
      const { nangoConnectionId, organisationId, region } = event.data;

      try {
        const connection = await getNangoConnection({
          nangoClient,
          nangoAuthType,
          nangoConnectionId,
        });

        await validateInstallationFn({
          nangoConnectionId,
          organisationId,
          region,
          connection: connection as never,
        });

        await step.sendEvent('installation-succeeded', [
          {
            name: `${name}/organisation.installed`,
            data: {
              organisationId,
              region,
            },
          },
          {
            name: `${name}/users.sync.requested`,
            data: {
              organisationId,
              nangoConnectionId,
              region,
              syncStartedAt: new Date().toISOString(),
            },
          },
          {
            name: `${region}/elba/connection_status.updated`,
            data: {
              sourceId,
              organisationId,
              errorType: null,
            },
          },
        ]);

        return { message: 'Organisation integration installation validation succeeded' };
      } catch (error) {
        logger.error('Failed to validate installation', {
          organisationId,
          region,
          nangoConnectionId,
          error,
        });

        const connectionError = getErrorCausedBy({ error, errorClass: IntegrationConnectionError });
        const errorType = connectionError ? connectionError.type : 'unknown';
        const errorMetadata = serializeLogObject(connectionError?.metadata || error) as unknown;

        await step.sendEvent('installation-failed', {
          name: `${region}/elba/connection_status.updated`,
          data: {
            sourceId,
            organisationId,
            errorType,
            errorMetadata,
          },
        });

        return {
          message: 'Organisation integration installation validation failed',
          errorType,
          errorMetadata,
        };
      }
    }
  );
};
