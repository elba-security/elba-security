import type { MiddlewareRegisterReturn } from 'inngest';
import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import type { AnyElbaInngest } from '../client/inngest';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
});

const hasRequiredDataProperties = (data: unknown): data is z.infer<typeof requiredDataSchema> =>
  requiredDataSchema.safeParse(data).success;

export type UnauthorizedMiddlewareOptions = {
  isUnauthorizedError: (error: unknown) => boolean;
};

export const unauthorizedMiddleware = ({ isUnauthorizedError }: UnauthorizedMiddlewareOptions) =>
  new InngestMiddleware({
    name: 'unauthorized',
    init: ({ client }) =>
      ({
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
              if (isUnauthorizedError(error)) {
                if (hasRequiredDataProperties(data)) {
                  await (client as AnyElbaInngest).send({
                    name: `${client.id}/app.uninstalled`,
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
                      `${client.id} returned an unauthorized status code for '${fn.name}'`,
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
      }) as MiddlewareRegisterReturn,
  });
