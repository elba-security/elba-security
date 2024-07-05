import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { SentryError } from '@/connectors/common/error';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
});

const sentryUnauthorizedError = z.object({
  errors: z.array(
    z.object({
      extensions: z.object({
        code: z.literal('AUTHENTICATION_ERROR'),
      }),
    })
  ),
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

            if (!(error instanceof SentryError) || !error.response) {
              return;
            }

            try {
              const response: unknown = await error.response.clone().json();
              const isUnauthorizedError = sentryUnauthorizedError.safeParse(response).success;
              if (!isUnauthorizedError) {
                return;
              }
            } catch (_error) {
              return;
            }

            if (hasRequiredDataProperties(data)) {
              await client.send({
                name: 'sentry/app.uninstalled',
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
                  `Sentry returned an unauthorized status code for '${fn.name}'`,
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
