import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { GustoError } from '@/connectors/common/error';

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

            if (!(error instanceof GustoError) || error.response?.status !== 401) {
              return;
            }

            if (hasRequiredDataProperties(data)) {
              await client.send({
                name: 'gusto/app.uninstalled',
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
                  `Gusto returned an unauthorized status code for '${fn.name}'`,
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
