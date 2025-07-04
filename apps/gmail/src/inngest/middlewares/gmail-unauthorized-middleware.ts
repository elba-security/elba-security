import { InngestMiddleware, NonRetriableError } from 'inngest';
import { GoogleUnauthorizedError } from '@/connectors/google/errors';

export const gmailUnauthorizedMiddleware = new InngestMiddleware({
  name: 'gmail-unauthorized-middleware',
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
            if (error instanceof GoogleUnauthorizedError) {
              // eslint-disable-next-line -- data is any
              const organisationId = data?.organisationId;
              if (typeof organisationId === 'string') {
                await client.send({
                  name: 'gmail/common.remove_organisation.requested',
                  data: { organisationId },
                });
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new NonRetriableError(`Google unauthorized error for '${fn.name}'`, {
                    cause: error,
                  }),
                },
              };
            }
          },
        };
      },
    };
  },
});
