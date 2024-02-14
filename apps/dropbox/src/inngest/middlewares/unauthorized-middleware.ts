import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { DropboxResponseError } from 'dropbox';

const apiRequiredDataSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string(),
});

const hasApiRequiredDataProperties = (
  data: unknown
): data is z.infer<typeof apiRequiredDataSchema> => apiRequiredDataSchema.safeParse(data).success;

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

            if (error instanceof DropboxResponseError && error.status === 401) {
              if (hasApiRequiredDataProperties(data)) {
                await client.send({
                  name: 'dropbox/elba_app.uninstall.requested',
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
                    `Dropbox return an unauthorized status code for ${fn.name}`,
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
