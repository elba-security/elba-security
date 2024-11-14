import { InngestMiddleware, NonRetriableError } from 'inngest';
import {
  ElbaError,
  DataProtectionErrorCode,
  type DataProtectionUpdateFailure,
} from '@elba-security/sdk';

export const createDataProtectionApiMiddleware = (events: string[]) =>
  new InngestMiddleware({
    name: 'data-protection-api-middleware',
    init: () => {
      return {
        onFunctionRun: ({ ctx: fnCtx }) => {
          if (!events.includes(fnCtx.event.name)) {
            return {};
          }

          return {
            transformOutput: async (ctx) => {
              const {
                result: { error, ...result },
                ...context
              } = ctx;
              const isElbaApiError = error instanceof ElbaError;

              if (!isElbaApiError || !error.response) {
                return ctx;
              }

              const response = (await error.response.json()) as DataProtectionUpdateFailure;
              const trialOrgIssuesLimitExceededError = response.errors.find(
                ({ code }) => code === DataProtectionErrorCode.TrialOrgIssuesLimitExceeded
              );

              if (trialOrgIssuesLimitExceededError) {
                return {
                  ...context,
                  result: {
                    ...result,
                    error: new NonRetriableError(trialOrgIssuesLimitExceededError.message),
                  },
                };
              }

              return ctx;
            },
          };
        },
      };
    },
  });
