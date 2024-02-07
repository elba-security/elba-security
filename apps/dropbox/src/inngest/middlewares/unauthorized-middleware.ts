import { eq } from 'drizzle-orm';
import { InngestMiddleware, NonRetriableError } from 'inngest';
import { z } from 'zod';
import { db } from '@/database/client';
import { DropboxResponseError } from 'dropbox';
import { organisations } from '@/database';
import { getElba } from '@/connectors/elba/client';

const apiRequiredDataSchema = z.object({
  organisationId: z.string().uuid(),
  region: z.string(),
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

            if (error instanceof DropboxResponseError && error.status === 401) {
              if (hasApiRequiredDataProperties(data)) {
                const elba = getElba({
                  organisationId: data.organisationId,
                  region: data.region,
                });

                await db
                  .delete(organisations)
                  .where(eq(organisations.organisationId, data.organisationId));
                await elba.connectionStatus.update({ hasError: true });
              }
              return {
                ...context,
                result: {
                  ...result,
                  error: new NonRetriableError(
                    `Dropbox return an unauthorized status code for ${fn.name}`,
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
