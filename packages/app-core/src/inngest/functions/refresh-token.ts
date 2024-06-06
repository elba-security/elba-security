import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { PgTable } from 'drizzle-orm/pg-core/table';
import type { InferSelectModel } from 'drizzle-orm/table';
import { NonRetriableError, type Inngest } from 'inngest';
import { addSeconds, subSeconds } from 'date-fns';
import { eq, and } from 'drizzle-orm';
import { decryptRecord, encryptRecord, type EncryptedKeys } from '../../encryption';

export type GetRefreshedToken<T extends PgTable> = (
  organisation: InferSelectModel<T>
) => Promise<{ organisation: PgUpdateSetSource<T>; expiresIn: number }>;

type CreateRefreshTokenFunctionParams<T extends PgTable> = {
  inngest: Inngest.Any;
  database: {
    db: NeonDatabase<{ organisationsTable: T }>;
    organisationsTable: T;
    encryptedKeys: EncryptedKeys<InferSelectModel<T>>;
    encryptionKey: string;
  };
  getRefreshedToken: GetRefreshedToken<T>;
  /** Advence to refresh the token before it expires (in seconds) */
  refreshAdvence: number;
  /** Backoff before starting a new attempt to refresh the token (in seconds) */
  failureBackoff: number;
};

type RefreshTokenEventData = {
  organisationId: string;
  expiresAt: number;
  refreshAt?: number;
};

// TODO: add support to handle errors from SaaS (uninstall org ?)
export const createRefreshTokenFunction = <T extends PgTable>({
  inngest,
  database: { db, organisationsTable, encryptedKeys, encryptionKey },
  getRefreshedToken,
  refreshAdvence,
  failureBackoff,
}: CreateRefreshTokenFunctionParams<T>) => {
  const eventName = `${inngest.id}/token.refresh.requested`;

  return inngest.createFunction(
    {
      id: `${inngest.id}-refresh-token`,
      concurrency: {
        key: 'event.data.organisationId',
        limit: 1,
      },
      cancelOn: [
        {
          event: `${inngest.id}/app.uninstalled`,
          match: 'data.organisationId',
        },
        {
          event: `${inngest.id}/app.installed`,
          match: 'data.organisationId',
        },
      ],
      retries: 5,
      onFailure: async ({ event, step }) => {
        const { organisationId, expiresAt } = event.data.event.data as RefreshTokenEventData;
        await step.sendEvent('reschedule-token-refresh', {
          name: eventName,
          data: {
            organisationId,
            expiresAt,
            refreshAt: addSeconds(new Date(), failureBackoff).getTime(),
          } satisfies RefreshTokenEventData,
        });
      },
    },
    {
      event: eventName,
    },
    async ({ event, step }) => {
      const { organisationId, expiresAt, refreshAt } = event.data as RefreshTokenEventData;

      if (refreshAt) {
        await step.sleepUntil('wait-until-refresh', new Date(refreshAt));
      } else {
        await step.sleepUntil(
          'wait-before-expiration',
          subSeconds(new Date(expiresAt), refreshAdvence)
        );
      }

      const nextExpiresAt = await step.run('refresh-token', async () => {
        const [organisation] = await db
          .select()
          .from(organisationsTable)
          // @ts-expect-error -- too hard to infer
          .where(and(eq(organisationsTable.id, organisationId)));

        if (!organisation) {
          throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
        }

        const decryptedOrganisation = await decryptRecord({
          data: organisation,
          encryptedKeys,
          encryptionKey,
        });

        const result = await getRefreshedToken(decryptedOrganisation);

        const set = await encryptRecord({
          data: result.organisation,
          encryptedKeys,
          encryptionKey,
        });

        await db
          .update(organisationsTable)
          .set(set)
          // @ts-expect-error -- too hard to infer
          .where(eq(organisationsTable.id, organisationId));

        return addSeconds(new Date(), result.expiresIn);
      });

      await step.sendEvent('next-refresh', {
        name: eventName,
        data: {
          organisationId,
          expiresAt: new Date(nextExpiresAt).getTime(),
        } satisfies RefreshTokenEventData,
      });
    }
  );
};
