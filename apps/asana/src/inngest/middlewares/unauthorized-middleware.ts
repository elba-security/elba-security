import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { AsanaError } from '@/connectors/common/error';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
});

// TODO: @Guillaume, We need to discussed about this schema
const asanaUnauthorizedError = z.object({
  errors: z.array(
    z.object({
      message: z.union([
        z.literal('Not Authorized'),
        z.string().refine((message) => message.includes('token has expired')),
      ]),
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

            if (!(error instanceof AsanaError) || !error.response) {
              return;
            }

            try {
              const response: unknown = await error.response.clone().json();
              // DOC: https://developers.asana.com/docs/errors#missing-authorization-header
              const isUnauthorizedError = asanaUnauthorizedError.safeParse(response).success;
              if (!isUnauthorizedError) {
                return;
              }
            } catch (_error) {
              return;
            }

            if (hasRequiredDataProperties(data)) {
              await client.send({
                name: 'asana/app.uninstalled',
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
                  `Asana returned an unauthorized status code for '${fn.name}'`,
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
