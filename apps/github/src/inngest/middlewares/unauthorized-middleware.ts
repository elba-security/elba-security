import { RequestError } from '@octokit/request-error';
import { eq } from 'drizzle-orm';
import { InngestMiddleware, NonRetriableError } from 'inngest';
import { Elba } from '@elba-security/sdk';
import { z } from 'zod';
import { env } from '@/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';

const apiRequiredDataSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string().min(0),
});

const hasApiRequiredDataProperties = (
  data: unknown
): data is z.infer<typeof apiRequiredDataSchema> => apiRequiredDataSchema.safeParse(data).success;

export const unauthorizedMiddleware = new InngestMiddleware({
  name: 'unauthorized',
  init: () => {
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

            if (error instanceof RequestError && error.response?.status === 401) {
              if (hasApiRequiredDataProperties(data)) {
                const elba = new Elba({
                  organisationId: data.organisationId,
                  region: data.region,
                  sourceId: env.ELBA_SOURCE_ID,
                  apiKey: env.ELBA_API_KEY,
                  baseUrl: env.ELBA_API_BASE_URL,
                });
                await db.delete(Organisation).where(eq(Organisation.id, data.organisationId));
                await elba.connectionStatus.update({ hasError: true });
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
