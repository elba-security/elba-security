import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { MondayError } from '@/connectors/common/error';

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

            //TODO: We can confirm that we always only receive 401 when the app is uninstalled
            // sometimes we may receive 401 when the token is expired Or if the user provided invalid id for deletion of user
            // Error should be handled properly based on the error message
            if (error instanceof MondayError && error.response?.status === 401) {
              if (hasRequiredDataProperties(data)) {
                await client.send({
                  name: 'monday/app.uninstalled',
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
                    `monday returned an unauthorized status code for '${fn.name}'`,
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
