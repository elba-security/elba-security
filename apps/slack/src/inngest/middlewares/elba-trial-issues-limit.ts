import { InngestMiddleware, NonRetriableError } from 'inngest';
import { ElbaError } from '@elba-security/sdk';
import { z } from 'zod';

const requiredDataSchema = z.object({
  teamId: z.string().min(1),
});

export const elbaTrialIssuesLimitExceededMiddleware = new InngestMiddleware({
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
                name: 'slack/sync.cancel',
                data: {
                  teamId: requiredDataResult.data.teamId,
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
