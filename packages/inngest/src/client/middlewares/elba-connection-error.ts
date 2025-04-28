import { getErrorCausedBy, IntegrationConnectionError } from '@elba-security/common';
import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { elbaRegionSchema } from '@elba-security/schemas';
import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { type CreateElbaInngestMiddlewareFn } from './types';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
  region: elbaRegionSchema,
});

export const createElbaConnectionErrorMiddleware: CreateElbaInngestMiddlewareFn = ({
  name,
  sourceId,
}) => {
  return new InngestMiddleware({
    name: 'elba-connection-error',
    init: ({ client }) => {
      return {
        onFunctionRun: ({
          fn,
          ctx: {
            runId,
            event: { data },
          },
        }) => {
          return {
            transformOutput: async (ctx) => {
              const {
                result: { error, ...result },
                ...context
              } = ctx;

              const connectionError = getErrorCausedBy({
                error,
                errorClass: IntegrationConnectionError,
              });
              if (!connectionError) {
                return;
              }

              const errorType = connectionError.type;
              const requiredDataResult = requiredDataSchema.safeParse(data);
              if (requiredDataResult.success) {
                const { organisationId, region } = requiredDataResult.data;
                await client.send([
                  {
                    name: `${region}/elba/connection_status.updated`,
                    data: {
                      sourceId,
                      organisationId,
                      errorType,
                      errorMetadata: serializeLogObject(error) as unknown,
                    },
                  },
                  {
                    name: `${name}/organisation.uninstalled`,
                    data: {
                      organisationId,
                      region,
                    },
                  },
                ]);
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new NonRetriableError(
                    `Detected '${errorType}' connection error in '${fn.name}' with id '${runId}'`,
                    {
                      cause: error,
                    }
                  ),
                },
              };
            },
          };
        },
      };
    },
  });
};
