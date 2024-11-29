import { InngestMiddleware } from 'inngest';
import { ElbaError, type DataProtectionUpdateFailure } from '@elba-security/sdk';

const hasOrganisationIdProperty = (data: unknown): data is { organisationId: string } =>
  typeof data === 'object' &&
  data !== null &&
  'organisationId' in data &&
  typeof data.organisationId === 'string';

export const createDataProtectionApiMiddleware = (cancelEventName: string) =>
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
                result: { error },
              } = ctx;
              const isElbaApiError = error instanceof ElbaError;

              if (!isElbaApiError || !error.response) {
                return ctx;
              }

              const response = (await error.response.clone().json()) as DataProtectionUpdateFailure;
              const trialOrgIssuesLimitExceededError = response.errors.find(
                ({ code }) => code === 'trial_org_issues_limit_exceeded'
              );

              if (trialOrgIssuesLimitExceededError && hasOrganisationIdProperty(data)) {
                await client.send({
                  name: cancelEventName,
                  data: {
                    organisationId: data.organisationId,
                  },
                });
              }

              return ctx;
            },
          };
        },
      };
    },
  });
