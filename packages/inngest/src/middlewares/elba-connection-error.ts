import { serializeLogObject } from '@elba-security/logger/src/serialize';
import { elbaRegionSchema, type ConnectionErrorType } from '@elba-security/schemas';
import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
  region: elbaRegionSchema,
});

export type MapConnectionErrorFn = (error: unknown) => ConnectionErrorType | null;

export const createElbaConnectionErrorMiddelware = ({
  mapErrorFn,
  eventName,
}: {
  mapErrorFn: (error: unknown) => ConnectionErrorType | null;
  eventName: string;
}) => {
  return new InngestMiddleware({
    name: 'elba-connection-error',
    init: ({ client }) => {
      return {
        onFunctionRun: ({
          fn,
          ctx: {
            event: { data },
          },
        }) => {
          return {
            transformOutput: async (ctx) => {
              const {
                result: { error, ...result },
                ...context
              } = ctx;

              const errorType = mapErrorFn(error);
              if (!errorType) {
                return;
              }

              const requiredDataResult = requiredDataSchema.safeParse(data);
              if (requiredDataResult.success) {
                await client.send({
                  name: eventName,
                  data: {
                    organisationId: requiredDataResult.data.organisationId,
                    region: requiredDataResult.data.region,
                    errorType,
                    errorMetadata: serializeLogObject(error) as unknown,
                  },
                });
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new NonRetriableError(`Detected '${errorType}' error in '${fn.name}'`, {
                    cause: error,
                  }),
                },
              };
            },
          };
        },
      };
    },
  });
};
