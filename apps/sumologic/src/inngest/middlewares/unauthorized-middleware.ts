import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { SumologicError } from '@/connectors/common/error';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
});

const hasRequiredDataProperties = (data: unknown): data is z.infer<typeof requiredDataSchema> =>
  requiredDataSchema.safeParse(data).success;

export const unauthorizedMiddleware = new InngestMiddleware({
  name: 'unauthorized',
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

            if (
              error instanceof SumologicError &&
              error.response &&
              [401, 403].includes(error.response.status) // Error 403  json response, { errorMessages: [ 'error.no-permission' ], errors: {} }
            ) {
              if (hasRequiredDataProperties(data)) {
                await client.send({
                  name: 'sumologic/app.uninstalled',
                  data: {
                    organisationId: data.organisationId,
                  },
                });
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new NonRetriableError(
                    `Sumologic returned an unauthorized status code for '${fn.name}'`,
                    {
                      cause: error,
                    }
                  ),
                },
              };
            }
          },
        };
      },
    };
  },
});
