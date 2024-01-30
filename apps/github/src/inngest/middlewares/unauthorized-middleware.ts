import { RequestError } from '@octokit/request-error';
import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
});

const hasRequiredDataProperties = (data: unknown): data is z.infer<typeof requiredDataSchema> =>
  requiredDataSchema.safeParse(data).success;

const isGithubAuthorizationError = (error: unknown) => {
  if (!(error instanceof RequestError)) return false;
  // occures when the github elba app have unsufficient permissions
  if (error.response?.status === 401) return true;
  // occures when the github elba app is uninstalled
  if (error.response?.status === 404) {
    return error.request.url.endsWith('/access_tokens');
  }
  return false;
};

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
            if (isGithubAuthorizationError(error)) {
              if (hasRequiredDataProperties(data)) {
                await client.send({
                  name: 'github/github.elba_app.uninstalled',
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
                    `Github return an unauthorized status code for '${fn.name}'`,
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
