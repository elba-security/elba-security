import { InngestMiddleware, NonRetriableError } from 'inngest';
import { ElbaError } from '@elba-security/sdk';
import { z } from 'zod';
import { elbaRegionSchema } from '@elba-security/schemas';

const requiredDataSchema = z.object({
  organisationId: z.string().uuid(),
  region: elbaRegionSchema.optional(),
});

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

              const requiredDataResult = requiredDataSchema.safeParse(data);
              if (requiredDataResult.success) {
                await client.send({
                  name: cancelEventName,
                  data: {
                    organisationId: requiredDataResult.data.organisationId,
                    region: requiredDataResult.data.region,
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
