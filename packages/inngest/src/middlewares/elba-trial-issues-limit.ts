import { InngestMiddleware, NonRetriableError } from 'inngest';
import { ElbaError } from '@elba-security/sdk';

const hasOrganisationIdProperty = (data: unknown): data is { organisationId: string } =>
  typeof data === 'object' &&
  data !== null &&
  'organisationId' in data &&
  typeof data.organisationId === 'string';

export const createElbaTrialIssuesLimitExceededMiddleware = (cancelEventName: string) =>
  new InngestMiddleware({
    name: 'data-protection-api-middleware',
    init: ({ client }) => {
      return {
        onFunctionRun: ({
          ctx: {
            event: { data },
          },
        }) => {
          return {
            transformOutput: async (ctx) => {
              const {
                result: { error, ...result },
              } = ctx;
              if (!(error instanceof ElbaError) || !error.elbaApiErrors) {
                return ctx;
              }

              const trialOrgIssuesLimitExceededError = error.elbaApiErrors.find(
                ({ code }) => code === 'trial_org_issues_limit_exceeded'
              );
              if (!trialOrgIssuesLimitExceededError) {
                return ctx;
              }

              if (hasOrganisationIdProperty(data)) {
                await client.send({
                  name: cancelEventName,
                  data: {
                    organisationId: data.organisationId,
                  },
                });
              }

              return {
                ...ctx,
                result: {
                  ...result,
                  error: new NonRetriableError('Trial issues limit exceeded', { cause: error }),
                },
              };
            },
          };
        },
      };
    },
  });
